const { z } = require("zod");
const { NOTIFICATION_TYPES } = require("../models/Notification");

const sendNotificationSchema = z
  .object({
    recipients: z.array(z.string().min(1)).min(1).max(1000),
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(2000),
    refModel: z
      .enum(["Application", "Interview", "HomeVisit", "Foster", "MonitoringReport", "Event", "Pet", "Payment"])
      .optional(),
    refId: z.string().optional(),
  })
  .strict();

const addNoteSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
  })
  .strict();

module.exports = { sendNotificationSchema, addNoteSchema };
