import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  handleGetPatientUpcoming,
  handleGetPatientPast,
  handleGetBookedTimes,
  handleCancelBooking,
} from "./bookings.controller";

const router = Router();

router.get("/upcoming", requireAuth, requireRole("patient"), handleGetPatientUpcoming);
router.get("/past", requireAuth, requireRole("patient"), handleGetPatientPast);
router.get("/booked-times", requireAuth, requireRole("patient"), handleGetBookedTimes);
router.patch("/:id/cancel", requireAuth, requireRole("patient"), handleCancelBooking);

export default router;
