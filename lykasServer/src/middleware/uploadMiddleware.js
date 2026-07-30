const multer = require("multer");

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10MB default

/**
 * §4 / §11.6.3 — the source's uploadMiddleware.js caps file size via
 * MAX_FILE_SIZE but does not validate MIME type or extension at all, so any
 * file under the size cap is accepted as a "pet photo." This adds an
 * explicit allowlist per upload category, enforced at the multer
 * `fileFilter` level — before the buffer ever reaches Cloudinary.
 */
const ALLOWLISTS = {
  image: ["image/jpeg", "image/png", "image/webp"],
  document: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

function buildFileFilter(category) {
  const allowed = ALLOWLISTS[category] || ALLOWLISTS.image;
  return (req, file, cb) => {
    if (!allowed.includes(file.mimetype)) {
      const err = new Error(
        `Unsupported file type "${file.mimetype}". Allowed: ${allowed.join(", ")}`
      );
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  };
}

// Memory storage — the controller streams req.file.buffer straight to
// Cloudinary itself; nothing is ever written to local disk.
function uploader(category = "image") {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: buildFileFilter(category),
  });
}

module.exports = { uploader, MAX_FILE_SIZE };
