const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/medicalRecordController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/medicalRecord.schema");

router.use(protect, adminOnly); // medical records are staff-only, front to back

router.get("/summary/:petId", ctrl.petSummary);

router.post("/vaccinations", validateRequest(schemas.createVaccinationSchema), ctrl.createVaccination);
router.get("/vaccinations/upcoming", ctrl.upcomingVaccinations);
router.get("/vaccinations/:petId", ctrl.vaccinationsForPet);
router.put("/vaccinations/:id", validateRequest(schemas.updateVaccinationSchema), ctrl.updateVaccination);
router.delete("/vaccinations/:id", ctrl.deleteVaccination);

router.post("/vet-visits", validateRequest(schemas.createVetVisitSchema), ctrl.createVetVisit);
router.get("/vet-visits/:petId", ctrl.vetVisitsForPet);
router.put("/vet-visits/:id", validateRequest(schemas.updateVetVisitSchema), ctrl.updateVetVisit);
router.delete("/vet-visits/:id", ctrl.deleteVetVisit);

router.post("/records", validateRequest(schemas.createMedicalRecordEntrySchema), ctrl.createRecord);
router.get("/records/:petId", ctrl.recordsForPet);
router.put("/records/:id", validateRequest(schemas.updateMedicalRecordEntrySchema), ctrl.updateRecord);
router.delete("/records/:id", ctrl.deleteRecord);

module.exports = router;
