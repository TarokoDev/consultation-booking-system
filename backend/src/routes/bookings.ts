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
      "SELECT id FROM slots WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
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

export default router;
