import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  handleGetDoctorUpcoming,
  handleGetDoctorPast,
  handleCompleteBooking,
} from "./bookings.controller";

const router = Router();

router.get("/upcoming", requireAuth, requireRole("doctor"), handleGetDoctorUpcoming);
router.get("/past", requireAuth, requireRole("doctor"), handleGetDoctorPast);
router.patch("/:id/complete", requireAuth, requireRole("doctor"), handleCompleteBooking);

export default router;
