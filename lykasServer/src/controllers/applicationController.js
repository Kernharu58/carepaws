const Application = require("../models/Application");
const Interview = require("../models/Interview");
const HomeVisit = require("../models/HomeVisit");
const RiskAssessment = require("../models/RiskAssessment");
const Pet = require("../models/Pet");
const User = require("../models/User");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");
const { sendCsv } = require("../utils/exportUtil");
const { notify } = require("../utils/notificationHelper");

const searchFields = ["phone", "address"];
const filterFields = ["status", "stage", "type"];

function isStaff(user) {
  return ["staff", "admin", "super_admin"].includes(user.role);
}

async function findApplicationOr404(id) {
  const application = await Application.findById(id);
  if (!application) throw new AppError("Application not found", 404);
  return application;
}

/** Requester must be the applicant themselves, or staff. */
function assertOwnerOrStaff(application, user) {
  if (application.applicant.toString() !== user._id.toString() && !isStaff(user)) {
    throw new AppError("You do not have permission to view this application", 403);
  }
}

// ---------------------------------------------------------------------------

/**
 * §5.3's Applications route table has no POST / — but §6.4's core UX flow
 * ("submit an adoption application") requires one, and nothing else in the
 * API creates an Application record. Added deliberately, same as the
 * refresh-token endpoint in the Identity & Access slice.
 */
const createApplication = asyncHandler(async (req, res) => {
  const pet = await Pet.findOne({ _id: req.body.pet, isDeleted: false });
  if (!pet) throw new AppError("Pet not found", 404);
  if (pet.status !== "Available") {
    throw new AppError(`This pet is not currently available (status: ${pet.status})`, 400);
  }

  // Staff recording a walk-in application can specify who the actual
  // applicant is; a regular user can only ever apply as themselves,
  // regardless of what (if anything) they send in `applicant`.
  const applicantId = isStaff(req.user) && req.body.applicant ? req.body.applicant : req.user._id;
  if (isStaff(req.user) && req.body.applicant) {
    const applicantUser = await User.findOne({ _id: req.body.applicant, isDeleted: false });
    if (!applicantUser) throw new AppError("Applicant not found", 404);
  }

  const existing = await Application.findOne({
    pet: pet._id,
    applicant: applicantId,
    status: "pending",
  });
  if (existing) throw new AppError("This applicant already has a pending application for this pet", 400);

  const { applicant: _ignored, ...rest } = req.body;
  const application = await Application.create({
    ...rest,
    applicant: applicantId,
    stageHistory: [{ stage: "submitted", changedBy: req.user._id, changedAt: new Date() }],
  });

  // A pending application puts the pet on hold from further applications.
  pet.status = "Pending";
  await pet.save();

  res.status(201).json({ success: true, data: application });
});

const myApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { applicant: req.user._id };

  const [data, total] = await Promise.all([
    Application.find(filter).sort("-createdAt").skip(skip).limit(limit).populate("pet", "name species imageUrl"),
    Application.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const listApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });

  const [data, total] = await Promise.all([
    Application.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species imageUrl")
      .populate("applicant", "displayName email"),
    Application.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const exportApplications = asyncHandler(async (req, res) => {
  const { filter } = buildListQuery(req.query, { searchFields, filterFields });

  const applications = await Application.find(filter)
    .sort("-createdAt")
    .populate("pet", "name")
    .populate("applicant", "displayName email")
    .lean();

  sendCsv(
    res,
    "applications.csv",
    applications.map((a) => ({
      ...a,
      petName: a.pet?.name,
      applicantName: a.applicant?.displayName,
      applicantEmail: a.applicant?.email,
    })),
    [
      { key: "petName", label: "Pet" },
      { key: "applicantName", label: "Applicant" },
      { key: "applicantEmail", label: "Email" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "stage", label: "Stage" },
      { key: "createdAt", label: "Submitted" },
    ]
  );
});

const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;

  const result = await Application.updateMany(
    { _id: { $in: ids } },
    { status, reviewedBy: req.user._id, reviewedAt: new Date() }
  );

  await logAudit({
    actor: req.user._id,
    action: "application.bulk_status",
    metadata: { ids, status, matched: result.matchedCount },
    req,
  });

  res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} application(s)` });
});

const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate("pet")
    .populate("applicant", "displayName email phone identityVerificationStatus");
  if (!application) throw new AppError("Application not found", 404);

  assertOwnerOrStaff(application, req.user);

  // Internal notes are never visible to the applicant, even on their own record.
  const payload = application.toObject();
  if (!isStaff(req.user)) delete payload.internalNotes;

  res.status(200).json({ success: true, data: payload });
});

const deleteApplication = asyncHandler(async (req, res) => {
  const application = await findApplicationOr404(req.params.id);
  await application.deleteOne();

  await logAudit({
    actor: req.user._id,
    action: "application.delete",
    entityType: "Application",
    entityId: req.params.id,
    req,
  });

  res.status(200).json({ success: true, message: "Application deleted" });
});

const updateStatus = asyncHandler(async (req, res) => {
  const application = await findApplicationOr404(req.params.id);
  const previousValues = { status: application.status };

  application.status = req.body.status;
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();

  if (req.body.status === "rejected") {
    application.stage = "rejected";
    application.stageHistory.push({ stage: "rejected", changedBy: req.user._id, changedAt: new Date() });

    // Releasing the hold lets the pet go back on the market.
    const pet = await Pet.findById(application.pet);
    if (pet && pet.status === "Pending") {
      pet.status = "Available";
      await pet.save();
    }
  }

  await application.save();

  if (["approved", "rejected"].includes(application.status)) {
    await notify({
      recipient: application.applicant,
      sender: req.user._id,
      type: application.status === "approved" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
      title: application.status === "approved" ? "Your application was approved!" : "Update on your application",
      message:
        application.status === "approved"
          ? "Congratulations — your adoption application has been approved."
          : "Your adoption application was not approved this time.",
      refModel: "Application",
      refId: application._id,
    });
  }

  await logAudit({
    actor: req.user._id,
    action: "application.status.update",
    entityType: "Application",
    entityId: application._id,
    previousValues,
    newValues: { status: application.status },
    req,
  });

  res.status(200).json({ success: true, data: application });
});

const updateStage = asyncHandler(async (req, res) => {
  const application = await findApplicationOr404(req.params.id);
  const previousValues = { stage: application.stage };

  application.stage = req.body.stage;
  application.stageHistory.push({
    stage: req.body.stage,
    changedBy: req.user._id,
    changedAt: new Date(),
    note: req.body.note,
  });
  await application.save();

  await logAudit({
    actor: req.user._id,
    action: "application.stage.update",
    entityType: "Application",
    entityId: application._id,
    previousValues,
    newValues: { stage: application.stage },
    req,
  });

  res.status(200).json({ success: true, data: application });
});

const applicationHistory = asyncHandler(async (req, res) => {
  const application = await findApplicationOr404(req.params.id);
  await application.populate("stageHistory.changedBy", "displayName");
  res.status(200).json({ success: true, data: application.stageHistory });
});

const getNotes = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("internalNotes.author", "displayName");
  if (!application) throw new AppError("Application not found", 404);
  res.status(200).json({ success: true, data: application.internalNotes });
});

const addNote = asyncHandler(async (req, res) => {
  const application = await findApplicationOr404(req.params.id);

  application.internalNotes.push({ author: req.user._id, text: req.body.text, createdAt: new Date() });
  await application.save();

  res.status(201).json({ success: true, data: application.internalNotes[application.internalNotes.length - 1] });
});

/**
 * GET /:id/vetting-status — a quick admin-facing readiness snapshot: has
 * this application's interview/home-visit/risk-assessment been done, and
 * what did each conclude. Aggregates across the sibling resources rather
 * than duplicating their state onto Application itself.
 */
const vettingStatus = asyncHandler(async (req, res) => {
  await findApplicationOr404(req.params.id);

  const [interview, homeVisit, riskAssessment] = await Promise.all([
    Interview.findOne({ application: req.params.id }).sort("-createdAt"),
    HomeVisit.findOne({ application: req.params.id }).sort("-createdAt"),
    RiskAssessment.findOne({ application: req.params.id }).sort("-createdAt"),
  ]);

  res.status(200).json({
    success: true,
    data: {
      interview: interview ? { status: interview.status, result: interview.result } : null,
      homeVisit: homeVisit
        ? { status: homeVisit.status, result: homeVisit.result, recommendation: homeVisit.report?.recommendation }
        : null,
      riskAssessment: riskAssessment
        ? { riskLevel: riskAssessment.riskLevel, recommendation: riskAssessment.recommendation }
        : null,
    },
  });
});

module.exports = {
  createApplication,
  myApplications,
  listApplications,
  exportApplications,
  bulkUpdateStatus,
  getApplication,
  deleteApplication,
  updateStatus,
  updateStage,
  applicationHistory,
  getNotes,
  addNote,
  vettingStatus,
};
