const mongoose = require("mongoose");

const vaccinationSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    vaccineName: { type: String, required: true },
    dateGiven: { type: Date, required: true },
    nextDueDate: { type: Date, index: true },
    administeredBy: { type: String },
    batchNumber: { type: String },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const vetVisitSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    visitDate: { type: Date, required: true },
    reason: { type: String, required: true },
    vetName: { type: String },
    clinic: { type: String },
    diagnosis: { type: String },
    treatment: { type: String },
    prescription: { type: String },
    followUpDate: { type: Date },
    cost: { type: Number },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const medicalRecordEntrySchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    type: {
      type: String,
      enum: ["Surgery", "Deworming", "Flea Treatment", "Dental", "Spay/Neuter", "Injury", "Illness", "Other"],
      required: true,
    },
    date: { type: Date, required: true },
    description: { type: String },
    performedBy: { type: String },
    outcome: { type: String },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    cost: { type: Number },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Vaccination = mongoose.models.Vaccination || mongoose.model("Vaccination", vaccinationSchema);
const VetVisit = mongoose.models.VetVisit || mongoose.model("VetVisit", vetVisitSchema);
const MedicalRecordEntry =
  mongoose.models.MedicalRecordEntry || mongoose.model("MedicalRecordEntry", medicalRecordEntrySchema);

module.exports = { Vaccination, VetVisit, MedicalRecordEntry };
