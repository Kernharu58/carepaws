const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Streams a buffer (from multer memory storage — never disk storage, see
 * uploadMiddleware.js) directly to Cloudinary. Returns the upload result,
 * whose `secure_url` is what gets saved on the owning record.
 */
function uploadBuffer(buffer, { folder, resourceType = "auto" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer };
