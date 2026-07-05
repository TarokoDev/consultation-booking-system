import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { handleCreateBooking } from "./bookings.controller";
import patientRouter from "./patient.routes";
import doctorRouter from "./doctor.routes";

const router = Router();

router.post("/", requireAuth, requireRole("patient"), handleCreateBooking);
router.use("/patient", patientRouter);
router.use("/doctor", doctorRouter);

export default router;
