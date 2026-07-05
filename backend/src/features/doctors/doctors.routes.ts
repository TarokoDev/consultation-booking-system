import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { getDoctors } from "./doctors.controller";

const router = Router();

router.get("/", requireAuth, getDoctors);

export default router;
