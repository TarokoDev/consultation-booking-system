import { pool } from "../../db";

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class BookingNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

export async function createBooking(slotId: number, patientId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const slotResult = await client.query(
      "SELECT id, start_time, end_time FROM slots WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [slotId]
    );
    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new BookingNotFoundError("Slot not found");
    }

    const existing = await client.query(
      `SELECT id FROM bookings
       WHERE slot_id = $1 AND status IN ('confirmed', 'completed') AND deleted_at IS NULL`,
      [slotId]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new BookingConflictError("This slot is already booked");
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
      [patientId, start_time, end_time]
    );
    if (overlap.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new BookingConflictError("You already have a booking at this time");
    }

    const insertResult = await client.query(
      `INSERT INTO bookings (slot_id, patient_id, status)
       VALUES ($1, $2, 'confirmed')
       RETURNING id, slot_id, patient_id, status, created_at`,
      [slotId, patientId]
    );

    await client.query("COMMIT");
    return insertResult.rows[0];
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw new BookingConflictError("This slot is already booked");
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function getPatientUpcoming(patientId: number) {
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at,
       s.id AS slot_id, s.start_time, s.end_time,
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
    [patientId]
  );
  return result.rows;
}

export async function getPatientPast(patientId: number) {
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at,
       s.id AS slot_id, s.start_time, s.end_time,
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
    [patientId]
  );
  return result.rows;
}

export async function getPatientBookedTimes(patientId: number, date: string) {
  const result = await pool.query(
    `SELECT s.start_time, s.end_time
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     WHERE b.patient_id = $1
       AND b.status = 'confirmed'
       AND b.deleted_at IS NULL
       AND s.start_time::date = $2::date`,
    [patientId, date]
  );
  return result.rows;
}

export async function cancelBooking(bookingId: number, patientId: number) {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND patient_id = $2 AND status = 'confirmed' AND deleted_at IS NULL`,
    [bookingId, patientId]
  );
  if (result.rowCount === 0) {
    throw new BookingNotFoundError("Booking not found");
  }
}

export async function getDoctorUpcoming(doctorId: number) {
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at,
       s.id AS slot_id, s.start_time, s.end_time,
       p.id AS patient_id,
       p.title AS patient_title,
       p.first_name AS patient_first_name,
       p.middle_name AS patient_middle_name,
       p.last_name AS patient_last_name
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN users p ON b.patient_id = p.id
     WHERE s.doctor_id = $1
       AND b.status = 'confirmed'
       AND s.start_time > now()
       AND b.deleted_at IS NULL
     ORDER BY s.start_time ASC`,
    [doctorId]
  );
  return result.rows;
}

export async function getDoctorPast(doctorId: number) {
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at,
       s.id AS slot_id, s.start_time, s.end_time,
       p.id AS patient_id,
       p.title AS patient_title,
       p.first_name AS patient_first_name,
       p.middle_name AS patient_middle_name,
       p.last_name AS patient_last_name
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN users p ON b.patient_id = p.id
     WHERE s.doctor_id = $1
       AND b.status IN ('confirmed', 'completed', 'cancelled')
       AND s.start_time <= now()
       AND b.deleted_at IS NULL
     ORDER BY s.start_time DESC`,
    [doctorId]
  );
  return result.rows;
}

export async function completeBooking(bookingId: number, doctorId: number) {
  const result = await pool.query(
    `UPDATE bookings b SET status = 'completed'
     FROM slots s
     WHERE b.slot_id = s.id
       AND b.id = $1
       AND s.doctor_id = $2
       AND b.status = 'confirmed'
       AND s.start_time <= now()
       AND b.deleted_at IS NULL`,
    [bookingId, doctorId]
  );
  if (result.rowCount === 0) {
    throw new BookingNotFoundError("Booking not found or not eligible to complete");
  }
}
