const nodemailer = require("nodemailer");
const { logger } = require("./logger");

let transporter = null;
let attempted = false;

/**
 * §4 — supports either the Gmail-style trio (EMAIL_SERVICE/EMAIL_USER/
 * EMAIL_PASSWORD) or the generic SMTP trio (EMAIL_HOST/EMAIL_PORT/
 * EMAIL_USERNAME/EMAIL_PASSWORD, e.g. Mailtrap in dev). If neither is
 * configured, email sending is skipped rather than treated as a boot-time
 * failure — preserving the source's graceful-degradation behavior.
 */
function getTransporter() {
  if (attempted) return transporter;
  attempted = true;

  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
  } else if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USERNAME) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD },
    });
  } else {
    logger.warn("No email transport configured — outgoing email will be skipped");
    transporter = null;
  }

  return transporter;
}

// Minimal built-in templates for what the Identity & Access domain needs.
// Once the Communication domain (EmailTemplate model) lands, this should
// try a DB-backed template by `key` first and fall back to these.
const DEFAULT_TEMPLATES = {
  "verify-email": ({ displayName, verifyUrl }) => ({
    subject: "Verify your CarePaws account",
    html: `<p>Hi ${escapeHtml(displayName)},</p><p>Please verify your email address to finish setting up your CarePaws account.</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  }),
  "reset-password": ({ displayName, resetUrl }) => ({
    subject: "Reset your CarePaws password",
    html: `<p>Hi ${escapeHtml(displayName)},</p><p>We received a request to reset your password. If this was you, click below:</p><p><a href="${resetUrl}">Reset my password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  }),
};

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/**
 * Sends a templated email. Returns { emailSkipped: true } instead of
 * throwing when no transport is configured, so signup/reset flows still
 * succeed in dev environments without email set up.
 */
async function sendTemplatedEmail(templateKey, to, variables = {}) {
  const client = getTransporter();
  if (!client) return { emailSkipped: true };

  const template = DEFAULT_TEMPLATES[templateKey];
  if (!template) {
    logger.error({ templateKey }, "Unknown email template key");
    return { emailSkipped: true };
  }

  const { subject, html } = template(variables);

  try {
    await client.sendMail({
      from: process.env.EMAIL_USER || process.env.EMAIL_USERNAME,
      to,
      subject,
      html,
    });
    return { emailSkipped: false };
  } catch (err) {
    logger.error({ err, templateKey, to }, "Failed to send email");
    return { emailSkipped: true, error: true };
  }
}

module.exports = { sendTemplatedEmail };
