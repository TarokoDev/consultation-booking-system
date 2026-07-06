import { pool } from "../../db";

export async function listDoctors() {

  // Select all doctors with the doctor details sorted by last name and first name
  const result = await pool.query(
    `SELECT id, title, first_name, middle_name, last_name, specialty
     FROM users
     WHERE role = 'doctor' AND deleted_at IS NULL
     ORDER BY last_name, first_name`
  );
  return result.rows;
}
