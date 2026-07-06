import { pool } from "../../db";
import type { UserRole } from "../../middleware/auth";

export async function listUsers(role?: UserRole) {
  // $1::user_role IS NULL lets one query serve both "all users" and
  // "filtered by role" — no string-built SQL branches.
  const result = await pool.query(
    `SELECT id, title, first_name, middle_name, last_name, email, role, specialty, created_at
     FROM users
     WHERE deleted_at IS NULL
       AND ($1::user_role IS NULL OR role = $1)
     ORDER BY role, last_name, first_name`,
    [role ?? null]
  );
  return result.rows;
}

// One query serves both sides: a user's bookings are rows where they are the
// patient (b.patient_id) OR the doctor behind the slot (s.doctor_id). Both
// parties' names are returned so the UI can show the counterpart regardless
// of which role is being viewed.
export async function getUserBookings(userId: number) {
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.notes, b.created_at,
       s.id AS slot_id, s.start_time, s.end_time,
       d.id AS doctor_id,
       d.title AS doctor_title,
       d.first_name AS doctor_first_name,
       d.middle_name AS doctor_middle_name,
       d.last_name AS doctor_last_name,
       d.specialty AS doctor_specialty,
       p.id AS patient_id,
       p.title AS patient_title,
       p.first_name AS patient_first_name,
       p.middle_name AS patient_middle_name,
       p.last_name AS patient_last_name
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN users d ON s.doctor_id = d.id
     JOIN users p ON b.patient_id = p.id
     WHERE (b.patient_id = $1 OR s.doctor_id = $1)
       AND b.deleted_at IS NULL
     ORDER BY s.start_time DESC`,
    [userId]
  );
  return result.rows;
}
