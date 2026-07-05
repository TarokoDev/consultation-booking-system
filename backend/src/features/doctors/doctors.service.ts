import { pool } from "../../db";

export async function listDoctors() {
  const result = await pool.query(
    `SELECT id, title, first_name, middle_name, last_name, specialty
     FROM users
     WHERE role = 'doctor' AND deleted_at IS NULL
     ORDER BY last_name, first_name`
  );
  return result.rows;
}
