import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { handleListUsers, handleGetUserBookings } from "./admin.controller";

const router = Router();

router.get("/users", requireAuth, requireRole("admin"), handleListUsers);
router.get("/users/:id/bookings", requireAuth, requireRole("admin"), handleGetUserBookings);

export default router;
