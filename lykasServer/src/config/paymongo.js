const { AppError } = require("../utils/AppError");
const { logger } = require("../utils/logger");

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

function authHeader() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) throw new AppError("PayMongo is not configured on this server", 500);
  // Standard HTTP Basic Auth: secret key as username, empty password.
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

/**
 * Creates a PayMongo Checkout Session. Request/response shape verified
 * against docs.paymongo.com/reference/create-a-checkout and multiple
 * working community integration examples (Laravel/PHP SDKs) as of this
 * writing — `line_items[]`, `payment_method_types[]`, `success_url`,
 * `cancel_url` are confirmed real fields; `data.attributes.checkout_url`
 * and `data.id` are confirmed real response fields.
 *
 * @param {object} params
 * @param {number} params.amount - integer, PHP centavos (₱500.00 = 50000)
 * @param {string} params.description
 * @param {string} params.successUrl
 * @param {string} params.cancelUrl
 * @param {object} [params.metadata] - carried through to the webhook payload
 */
async function createCheckoutSession({ amount, description, successUrl, cancelUrl, metadata }) {
  const res = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{ currency: "PHP", amount, name: description, quantity: 1 }],
          payment_method_types: ["gcash", "card", "paymaya", "grab_pay", "dob"],
          success_url: successUrl,
          cancel_url: cancelUrl,
          description,
          send_email_receipt: false,
          metadata,
        },
      },
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    logger.error({ status: res.status, body }, "PayMongo checkout session creation failed");
    throw new AppError(
      body?.errors?.[0]?.detail || "Failed to create payment checkout session",
      502
    );
  }

  return {
    paymongoPaymentId: body.data.id,
    checkoutUrl: body.data.attributes.checkout_url,
  };
}

module.exports = { createCheckoutSession };
