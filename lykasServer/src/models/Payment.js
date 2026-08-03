const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // §4 production fix — the source enum is only ["donation"], which can't
    // represent an adoption fee even though the intended UX flow (§6.4
    // step 3) charges one through this same pipeline. Extended per the
    // explicit instruction in §4/§5.2.
    type: { type: String, enum: ["donation", "adoption_fee", "event_fee"], required: true },
    amount: { type: Number, required: true }, // integer, PHP centavos
    currency: { type: String, default: "PHP" },
    description: { type: String },
    refModel: { type: String, enum: ["Application", "Event", null], default: null },
    refId: { type: mongoose.Schema.Types.ObjectId },
    paymongoPaymentId: { type: String, index: true },
    paymongoCheckoutUrl: { type: String },
    paymongoStatus: { type: String },
    paymentMethod: { type: String, enum: ["gcash", "card", "paymaya", "grab_pay", "dob", null], default: null },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending", index: true },
    paidAt: { type: Date },
    receiptUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
