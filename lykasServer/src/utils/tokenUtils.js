const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * §5.1 / §11.6.2 production fix: the original source issues a single 7-day JWT
 * with no rotation. Here we issue a short-lived access token (default 15m) plus
 * a long-lived, revocable refresh token. The refresh token is a random opaque
 * string; only its SHA-256 hash is ever stored (in Session.token), so a leaked
 * database can't be used to forge sessions.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString("hex");
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function refreshTokenExpiry() {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  refreshTokenExpiry,
};
