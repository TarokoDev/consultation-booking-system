import { Router } from "express";
import { pool } from "../db";
import { requireAuth, requireRole } from "../auth";

const router = Router();

router.post("/", requireAuth, requireRole("patient"), async (req, res) => {
  const { slotId } = req.body;
  if (!slotId) {
    return res.status(400).json({ error: "slotId is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const slotResult = await client.query(
      "SELECT id, start_time, end_time FROM slots WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [slotId]
    );
    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Slot not found" });
    }

    const existing = await client.query(
      `SELECT id FROM bookings
       WHERE slot_id = $1 AND status IN ('confirmed', 'completed') AND deleted_at IS NULL`,
      [slotId]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This slot is already booked" });
    }

    const { start_time, end_time } = slotResult.rows[0];
    const overlap = await client.query(
      `SELECT b.id FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       WHERE b.patient_id = $1
         AND b.status = 'confirmed'
         AND b.deleted_at IS NULL
         AND s.start_time < $3
         AND s.end_time > $2`,
      [req.user!.id, start_time, end_time]
    );
    if (overlap.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You already have a booking at this time" });
    }

    const insertResult = await client.query(
      `INSERT INTO bookings (slot_id, patient_id, status)
       VALUES ($1, $2, 'confirmed')
       RETURNING id, slot_id, patient_id, status, created_at`,
      [slotId, req.user!.id]
    );

    await client.query("COMMIT");
    return res.status(201).json({ booking: insertResult.rows[0] });
  } catch (err: any) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      return res.status(409).json({ error: "This slot is already booked" });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  } finally {
    client.release();
  }
});

router.get("/upcoming", requireAuth, requireRole("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT
       b.id,
       b.status,
       b.created_at,
       s.id AS slot_id,
       s.start_time,
       s.end_time,
       d.id AS doctor_id,
       d.title AS doctor_title,
       d.first_name AS doctor_first_name,
       d.middle_name AS doctor_middle_name,
       d.last_name AS doctor_last_name,
       d.specialty AS doctor_specialty
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN users d ON s.doctor_id = d.id
     WHERE b.patient_id = $1
       AND b.status = 'confirmed'
       AND s.start_time > now()
       AND b.deleted_at IS NULL
     ORDER BY s.start_time ASC`,
    [req.user!.id]
  );
  return res.json({ bookings: result.rows });
});

router.get("/booked-times", requireAuth, requireRole("patient"), async (req, res) => {
  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
  }
  const result = await pool.query(
    `SELECT s.start_time, s.end_time
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     WHERE b.patient_id = $1
       AND b.status = 'confirmed'
       AND b.deleted_at IS NULL
       AND s.start_time::date = $2::date`,
    [req.user!.id, date]
  );
  return res.json({ bookedTimes: result.rows });
});

router.patch("/:id/cancel", requireAuth, requireRole("patient"), async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND patient_id = $2 AND status = 'confirmed' AND deleted_at IS NULL`,
    [id, req.user!.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }
  return res.json({ message: "Booking cancelled" });
});

router.get("/past", requireAuth, requireRole("patient"), async (req, res) => {
  const result = await pool.query(
    `SELECT
       b.id,
       b.status,
       b.created_at,
       s.id AS slot_id,
       s.start_time,
       s.end_time,
       d.id AS doctor_id,
       d.title AS doctor_title,
       d.first_name AS doctor_first_name,
       d.middle_name AS doctor_middle_name,
       d.last_name AS doctor_last_name,
       d.specialty AS doctor_specialty
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN users d ON s.doctor_id = d.id
     WHERE b.patient_id = $1
       AND b.status IN ('completed', 'cancelled')
       AND b.deleted_at IS NULL
     ORDER BY s.start_time DESC`,
    [req.user!.id]
  );
  return res.json({ bookings: result.rows });
});

export default router;
