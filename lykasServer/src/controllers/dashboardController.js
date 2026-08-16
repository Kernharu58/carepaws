const Pet = require("../models/Pet");
const Application = require("../models/Application");
const { Foster } = require("../models/Foster");
const { Event } = require("../models/Event");
const EmergencyReport = require("../models/EmergencyReport");
const Volunteer = require("../models/Volunteer");
const Payment = require("../models/Payment");
const { asyncHandler } = require("../utils/AppError");

const dashboard = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    availablePets,
    pendingApplications,
    activeFosters,
    upcomingEvents,
    openEmergencyReports,
    pendingVolunteers,
    monthlyDonations,
  ] = await Promise.all([
    Pet.countDocuments({ status: "Available", isDeleted: false }),
    Application.countDocuments({ status: "pending" }),
    Foster.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "upcoming", date: { $gte: new Date() } }),
    EmergencyReport.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    Volunteer.countDocuments({ status: "pending", isDeleted: false }),
    Payment.aggregate([
      { $match: { status: "paid", paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      availablePets,
      pendingApplications,
      activeFosters,
      upcomingEvents,
      openEmergencyReports,
      pendingVolunteers,
      monthlyDonationsCentavos: monthlyDonations[0]?.total || 0,
    },
  });
});

module.exports = { dashboard };
