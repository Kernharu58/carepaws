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

// Minimal built-in fallback templates — used when no DB-backed
// EmailTemplate exists for a key yet, or the EmailTemplate collection is
// empty (e.g. a fresh install before an admin has customized anything).
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
 * Resolves subject/html for a template key: a DB-backed, admin-editable
 * EmailTemplate (Communication domain) takes priority when one exists and
 * is active, so ops can tweak copy without a deploy; otherwise falls back
 * to the built-in defaults above. Requiring the model lazily, inside the
 * function, avoids a circular-require issue at module load time and keeps
 * this util loadable even in contexts where Mongoose isn't connected yet.
 */
async function resolveTemplate(templateKey, variables) {
  try {
    const EmailTemplate = require("../models/EmailTemplate");
    const { substituteVariables } = require("../controllers/emailTemplateController");
    const dbTemplate = await EmailTemplate.findOne({ key: templateKey, isActive: true });

    if (dbTemplate) {
      return {
        subject: substituteVariables(dbTemplate.subject, variables),
        html: substituteVariables(dbTemplate.bodyHtml, variables),
      };
    }
  } catch (err) {
    logger.warn({ err, templateKey }, "Could not check for a DB-backed email template — using built-in default");
  }

  const fallback = DEFAULT_TEMPLATES[templateKey];
  return fallback ? fallback(variables) : null;
}

/**
 * Sends a templated email. Returns { emailSkipped: true } instead of
 * throwing when no transport is configured, so signup/reset flows still
 * succeed in dev environments without email set up.
 */
async function sendTemplatedEmail(templateKey, to, variables = {}) {
  const client = getTransporter();
  if (!client) return { emailSkipped: true };

  const resolved = await resolveTemplate(templateKey, variables);
  if (!resolved) {
    logger.error({ templateKey }, "Unknown email template key");
    return { emailSkipped: true };
  }

  try {
    await client.sendMail({
      from: process.env.EMAIL_USER || process.env.EMAIL_USERNAME,
      to,
      subject: resolved.subject,
      html: resolved.html,
    });
    return { emailSkipped: false };
  } catch (err) {
    logger.error({ err, templateKey, to }, "Failed to send email");
    return { emailSkipped: true, error: true };
  }
}

module.exports = { sendTemplatedEmail };
