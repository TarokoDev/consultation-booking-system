import { pool } from "../../db";

export async function getAvailableSlots(doctorId: string, date: string) {

  // Select all available slots for the doctor on a given date
  // Available slots are slots that are not booked by any patient
  const result = await pool.query(
    `SELECT s.id, s.start_time, s.end_time
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
  return result.rows;
}
