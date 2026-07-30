const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    role: {
      type: String,
      enum: ["user", "staff", "admin", "super_admin"],
      default: "user",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "locked"],
      default: "active",
      index: true,
    },
    lockedUntil: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },

    profilePicture: { type: String },
    notificationsEnabled: { type: Boolean, default: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pet" }],
    volunteerHours: { type: Number, default: 0 },

    phone: { type: String },
    address: { type: String },
    phoneVerified: { type: Boolean, default: false },
    addressConfirmed: { type: Boolean, default: false },

    identityVerificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },
    identityVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    identityVerifiedAt: { type: Date },
    identityVerificationNotes: { type: String },

    // §6.6 — needed to close the expo-notifications gap; source schema lacks it.
    pushToken: { type: String, select: false },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

userSchema.index({ displayName: "text", email: "text" });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** True if the account is currently in an active lockout window. */
userSchema.methods.isLocked = function isLocked() {
  return this.status === "locked" && this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.pushToken;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
