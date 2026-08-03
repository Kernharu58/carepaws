const { Foster, FosterReport } = require("../models/Foster");
const Pet = require("../models/Pet");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");
const { notify } = require("../utils/notificationHelper");

function isStaff(user) {
  return ["staff", "admin", "super_admin"].includes(user.role);
}

async function findFosterOr404(id) {
  const foster = await Foster.findById(id);
  if (!foster) throw new AppError("Foster placement not found", 404);
  return foster;
}

// --- Reports (fixed-path routes — registered before the /:id family) ---

const pendingReviewReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { reviewedBy: { $exists: false } };

  const [data, total] = await Promise.all([
    FosterReport.find(filter)
      .sort("-reportDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("fosterer", "displayName"),
    FosterReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const reviewReport = asyncHandler(async (req, res) => {
  const report = await FosterReport.findById(req.params.reportId);
  if (!report) throw new AppError("Foster report not found", 404);

  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  report.adminNotes = req.body.adminNotes;
  await report.save();

  res.status(200).json({ success: true, data: report });
});

// --- Fosters ---

const myFosters = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { fosterer: req.user._id };

  const [data, total] = await Promise.all([
    Foster.find(filter).sort("-startDate").skip(skip).limit(limit).populate("pet", "name species imageUrl"),
    Foster.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createFoster = asyncHandler(async (req, res) => {
  const pet = await Pet.findOne({ _id: req.body.pet, isDeleted: false });
  if (!pet) throw new AppError("Pet not found", 404);

  const foster = await Foster.create({ ...req.body, assignedBy: req.user._id });

  pet.status = "Foster";
  await pet.save();

  await logAudit({
    actor: req.user._id,
    action: "foster.create",
    metadata: { fosterId: foster._id, pet: pet._id, fosterer: foster.fosterer },
    req,
  });

  await notify({
    recipient: foster.fosterer,
    sender: req.user._id,
    type: "FOSTER_STARTED",
    title: "Foster placement started",
    message: `You're now fostering ${pet.name}. Thank you for opening your home!`,
    refModel: "Foster",
    refId: foster._id,
  });

  res.status(201).json({ success: true, data: foster });
});

const listFosters = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Foster.find(filter)
      .sort("-startDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species imageUrl")
      .populate("fosterer", "displayName email"),
    Foster.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getFoster = asyncHandler(async (req, res) => {
  const foster = await Foster.findById(req.params.id)
    .populate("pet", "name species imageUrl")
    .populate("fosterer", "displayName email");
  if (!foster) throw new AppError("Foster placement not found", 404);

  if (foster.fosterer._id.toString() !== req.user._id.toString() && !isStaff(req.user)) {
    throw new AppError("You do not have permission to view this foster placement", 403);
  }

  res.status(200).json({ success: true, data: foster });
});

const updateFoster = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.id);
  Object.assign(foster, req.body);
  await foster.save();
  res.status(200).json({ success: true, data: foster });
});

const endFoster = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.id);
  if (foster.status !== "active") throw new AppError("This foster placement is not active", 400);

  foster.status = "completed";
  foster.outcome = req.body.outcome;
  foster.returnNotes = req.body.returnNotes;
  foster.staffNotes = req.body.staffNotes ?? foster.staffNotes;
  foster.endDate = new Date();
  foster.closedAt = new Date();
  foster.endedBy = req.user._id;
  await foster.save();

  const pet = await Pet.findById(foster.pet);
  if (pet) {
    if (foster.outcome === "ADOPTED") {
      pet.status = "Adopted";
      pet.owner = foster.fosterer;
    } else if (foster.outcome === "RETURNED") {
      pet.status = "Available";
    }
    // EXTENDED leaves the pet's status as Foster — a new/extended Foster
    // placement is expected to be created separately.
    await pet.save();
  }

  await logAudit({
    actor: req.user._id,
    action: "foster.end",
    entityType: "Pet",
    entityId: foster.pet,
    metadata: { fosterId: foster._id, outcome: foster.outcome },
    req,
  });

  await notify({
    recipient: foster.fosterer,
    sender: req.user._id,
    type: "FOSTER_ENDED",
    title: "Foster placement ended",
    message: `Your foster placement has ended (outcome: ${foster.outcome}). Thank you for fostering!`,
    refModel: "Foster",
    refId: foster._id,
  });

  res.status(200).json({ success: true, data: foster });
});

const cancelFoster = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.id);

  foster.status = "cancelled";
  foster.staffNotes = req.body.staffNotes ?? foster.staffNotes;
  foster.closedAt = new Date();
  foster.endedBy = req.user._id;
  await foster.save();

  const pet = await Pet.findById(foster.pet);
  if (pet && pet.status === "Foster") {
    pet.status = "Available";
    await pet.save();
  }

  res.status(200).json({ success: true, data: foster });
});

/** GET /:id/can-finalize — has this foster met its weekly-reporting requirement? */
const canFinalize = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.id);

  const ready = foster.weeklyReportsSubmitted >= foster.weeklyReportsRequired;
  res.status(200).json({
    success: true,
    data: {
      canFinalize: ready,
      weeklyReportsRequired: foster.weeklyReportsRequired,
      weeklyReportsSubmitted: foster.weeklyReportsSubmitted,
      reason: ready
        ? null
        : `${foster.weeklyReportsRequired - foster.weeklyReportsSubmitted} weekly report(s) still outstanding`,
    },
  });
});

// --- Weekly reports, nested under a foster ---

const createFosterReport = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.fosterId);
  if (foster.fosterer.toString() !== req.user._id.toString() && !isStaff(req.user)) {
    throw new AppError("You do not have permission to submit a report for this foster placement", 403);
  }

  const report = await FosterReport.create({
    ...req.body,
    foster: foster._id,
    pet: foster.pet,
    fosterer: foster.fosterer,
  });

  foster.weeklyReportsSubmitted += 1;
  await foster.save();

  res.status(201).json({ success: true, data: report });
});

const listFosterReports = asyncHandler(async (req, res) => {
  const reports = await FosterReport.find({ foster: req.params.fosterId }).sort("weekNumber");
  res.status(200).json({ success: true, data: reports });
});

/** GET /:fosterId/reports/missing — which required week numbers have no report yet. */
const missingFosterReports = asyncHandler(async (req, res) => {
  const foster = await findFosterOr404(req.params.fosterId);
  const submitted = await FosterReport.find({ foster: foster._id }).distinct("weekNumber");
  const submittedSet = new Set(submitted);

  const missing = [];
  for (let week = 1; week <= foster.weeklyReportsRequired; week++) {
    if (!submittedSet.has(week)) missing.push(week);
  }

  res.status(200).json({ success: true, data: { missingWeeks: missing } });
});

module.exports = {
  pendingReviewReports,
  reviewReport,
  myFosters,
  createFoster,
  listFosters,
  getFoster,
  updateFoster,
  endFoster,
  cancelFoster,
  canFinalize,
  createFosterReport,
  listFosterReports,
  missingFosterReports,
};
