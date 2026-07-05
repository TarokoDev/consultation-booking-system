import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { login, logout, me } from "./auth.controller";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
