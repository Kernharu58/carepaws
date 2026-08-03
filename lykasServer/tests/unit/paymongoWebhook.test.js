const crypto = require("crypto");
const { verifyPaymongoSignature } = require("../../src/utils/paymongoWebhook");

const SECRET = "whsec_test_secret";

function buildValidHeader(rawBody, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000), live = false } = {}) {
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("hex");
  const key = live ? "li" : "te";
  return `t=${timestamp},${key}=${signature}`;
}

describe("paymongoWebhook.verifyPaymongoSignature", () => {
  const rawBody = JSON.stringify({ data: { id: "evt_123", attributes: { type: "payment.paid" } } });

  it("accepts a correctly-signed test-mode payload", () => {
    const header = buildValidHeader(rawBody);
    expect(verifyPaymongoSignature(rawBody, header, SECRET, { live: false })).toBe(true);
  });

  it("accepts a correctly-signed live-mode payload when live:true is requested", () => {
    const header = buildValidHeader(rawBody, { live: true });
    expect(verifyPaymongoSignature(rawBody, header, SECRET, { live: true })).toBe(true);
  });

  it("rejects a live-mode check against a test-mode-only signature", () => {
    const header = buildValidHeader(rawBody, { live: false });
    expect(verifyPaymongoSignature(rawBody, header, SECRET, { live: true })).toBe(false);
  });

  it("rejects when the body has been tampered with after signing", () => {
    const header = buildValidHeader(rawBody);
    const tamperedBody = rawBody.replace("payment.paid", "payment.failed");
    expect(verifyPaymongoSignature(tamperedBody, header, SECRET)).toBe(false);
  });

  it("rejects when the wrong secret is used to verify", () => {
    const header = buildValidHeader(rawBody, { secret: "whsec_the_real_one" });
    expect(verifyPaymongoSignature(rawBody, header, "whsec_a_different_one")).toBe(false);
  });

  it("rejects a stale timestamp outside the allowed replay window", () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 60 * 60; // 1 hour old
    const header = buildValidHeader(rawBody, { timestamp: staleTimestamp });
    expect(verifyPaymongoSignature(rawBody, header, SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyPaymongoSignature(rawBody, undefined, SECRET)).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    expect(verifyPaymongoSignature(rawBody, "not-a-valid-header-format", SECRET)).toBe(false);
  });

  it("rejects when no webhook secret is configured", () => {
    const header = buildValidHeader(rawBody);
    expect(verifyPaymongoSignature(rawBody, header, undefined)).toBe(false);
  });
});
