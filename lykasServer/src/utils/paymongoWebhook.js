const crypto = require("crypto");
const { logger } = require("./logger");

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60; // reject stale/replayed webhook deliveries

/**
 * §11.6 — PayMongo signs webhook deliveries with a `Paymongo-Signature`
 * header (Express lowercases it to `paymongo-signature`) shaped like:
 *   t=1716800978,te=<test-mode hmac hex>,li=<live-mode hmac hex>
 * The signature is HMAC-SHA256 of `<timestamp><raw request body>` (the
 * timestamp digits immediately followed by the raw JSON bytes, no
 * separator) using the webhook's endpoint secret. Sourced from PayMongo's
 * go-live checklist (docs.paymongo.com/docs/developer-tools-go-live-checklist)
 * and a verified community implementation
 * (developers.paymongo.com/discuss/6655332c39aa280058b1d545).
 *
 * CRITICAL: this must run against the raw, unparsed request body — see
 * server.js, which routes /api/payments/webhook through express.raw()
 * instead of the global express.json(), exactly because any parsing
 * before verification changes the bytes and breaks the HMAC check.
 */
function verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret, { live = false } = {}) {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const timestamp = parts.t;
  const expectedSignature = live ? parts.li : parts.te;
  if (!timestamp || !expectedSignature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
    logger.warn({ ageSeconds }, "PayMongo webhook signature timestamp outside allowed window");
    return false;
  }

  const payload = `${timestamp}${rawBody}`;
  const computedSignature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const computedBuf = Buffer.from(computedSignature, "hex");
  if (expectedBuf.length !== computedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, computedBuf);
}

module.exports = { verifyPaymongoSignature };
