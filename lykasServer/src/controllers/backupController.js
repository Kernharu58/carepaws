const path = require("path");
const fs = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");
const mongoose = require("mongoose");

const Backup = require("../models/Backup");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logger } = require("../utils/logger");

const execFileAsync = promisify(execFile);
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

const listBackups = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);

  const [data, total] = await Promise.all([
    Backup.find().sort("-createdAt").skip(skip).limit(limit).populate("createdBy", "displayName"),
    Backup.countDocuments(),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

/**
 * Shells out to `mongodump` — this requires the MongoDB Database Tools to
 * be installed on the host (they're not bundled with the mongodb driver).
 * The Dockerfile's base image would need `mongodb-database-tools` added
 * for this to work in a container; documented in the README rather than
 * silently assumed.
 */
const createBackup = asyncHandler(async (req, res) => {
  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.archive`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const backup = await Backup.create({
    type: req.body?.type || "manual",
    status: "running",
    fileName,
    filePath,
    createdBy: req.user._id,
  });

  // Respond immediately — mongodump on a real dataset can take a while,
  // and the client polls GET / for status rather than blocking the request.
  res.status(202).json({ success: true, data: backup, message: "Backup started" });

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await execFileAsync("mongodump", ["--uri", process.env.MONGO_URI, "--archive=" + filePath, "--gzip"]);

    const stats = await fs.stat(filePath);
    const collections = Object.keys(mongoose.connection.collections);

    backup.status = "completed";
    backup.sizeBytes = stats.size;
    backup.collections = collections;
    await backup.save();
  } catch (err) {
    logger.error({ err, backupId: backup._id }, "Backup failed");
    backup.status = "failed";
    backup.error = err.message;
    await backup.save();
  }
});

const downloadBackup = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new AppError("Backup not found", 404);
  if (backup.status !== "completed") throw new AppError("Backup is not ready for download", 400);

  res.download(backup.filePath, backup.fileName);
});

/**
 * Restoring is a genuinely dangerous, destructive operation on a live
 * database — this records the restore attempt and shells out to
 * `mongorestore`, but does NOT snapshot-before-restore or run in a
 * transaction (Mongo restores aren't transactional across collections).
 * A real production runbook should restore into a fresh instance and cut
 * over, not restore in-place — documented here rather than silently
 * implying this is a one-click safe operation.
 */
const restoreBackup = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new AppError("Backup not found", 404);
  if (backup.status !== "completed") throw new AppError("Only a completed backup can be restored", 400);

  await execFileAsync("mongorestore", ["--uri", process.env.MONGO_URI, "--archive=" + backup.filePath, "--gzip", "--drop"]);

  backup.restoredAt = new Date();
  backup.restoredBy = req.user._id;
  await backup.save();

  res.status(200).json({ success: true, message: "Restore completed", data: backup });
});

const deleteBackup = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new AppError("Backup not found", 404);

  await fs.unlink(backup.filePath).catch(() => {}); // already gone is fine
  await backup.deleteOne();

  res.status(200).json({ success: true, message: "Backup deleted" });
});

module.exports = { listBackups, createBackup, downloadBackup, restoreBackup, deleteBackup };
