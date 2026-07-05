import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { getSlots } from "./slots.controller";

const router = Router();

router.get("/", requireAuth, getSlots);

export default router;
