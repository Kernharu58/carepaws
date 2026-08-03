const Notification = require("../models/Notification");
const { logger } = require("./logger");

/**
 * Creates a Notification record for one recipient. Never throws — a
 * notification failing to send should not fail the action that triggered
 * it (e.g. an application approval shouldn't 500 because notifications
 * are down).
 *
 * §6.6 note: this is currently in-app-inbox-only, matching the source's
 * real gap. Once the mobile app's push-token registration lands
 * (utils/pushNotifications.ts in lykasUser), this function is the single
 * place to add the Expo push API call — gated on
 * `recipient.notificationsEnabled && recipient.pushToken` — so every
 * caller below gets push for free without individually wiring it.
 */
async function notify({ recipient, sender = null, type, title, message, refModel = null, refId = null }) {
  try {
    return await Notification.create({ recipient, sender, type, title, message, refModel, refId });
  } catch (err) {
    logger.error({ err, type, recipient }, "Failed to create notification");
    return null;
  }
}

/** Convenience for notifying several recipients with the same content. */
async function notifyMany(recipients, payload) {
  return Promise.all(recipients.map((recipient) => notify({ ...payload, recipient })));
}

module.exports = { notify, notifyMany };
