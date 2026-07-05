import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  handleGetDoctorBookedDates,
  handleGetDoctorUpcoming,
  handleGetDoctorPast,
  handleCompleteBooking,
} from "./bookings.controller";

const router = Router();

router.get("/booked-dates", requireAuth, requireRole("doctor"), handleGetDoctorBookedDates);
router.get("/upcoming", requireAuth, requireRole("doctor"), handleGetDoctorUpcoming);
router.get("/past", requireAuth, requireRole("doctor"), handleGetDoctorPast);
router.patch("/:id/complete", requireAuth, requireRole("doctor"), handleCompleteBooking);

export default router;
