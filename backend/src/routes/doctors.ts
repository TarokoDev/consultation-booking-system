import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, first_name, middle_name, last_name, specialty
     FROM users
     WHERE role = 'doctor' AND deleted_at IS NULL
     ORDER BY last_name, first_name`
  );
  res.json({ doctors: result.rows });
});

export default router;
