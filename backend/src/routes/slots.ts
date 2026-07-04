import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) {
    return res.status(400).json({ error: "doctorId and date are required" });
  }

  const result = await pool.query(
    `SELECT s.id, s.start_time
     FROM slots s
     WHERE s.doctor_id = $1
       AND s.start_time::date = $2::date
       AND s.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.slot_id = s.id
           AND b.status IN ('confirmed', 'completed')
           AND b.deleted_at IS NULL
       )
     ORDER BY s.start_time`,
    [doctorId, date]
  );
  res.json({ slots: result.rows });
});

export default router;
