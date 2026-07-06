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

export async function createBooking(slotId: number, patientId: number, notes: string) {
  const client = await pool.connect(); // Only one client at a time
  try {
    await client.query("BEGIN");

    // Check if the slot is available
    const slotResult = await client.query(
      "SELECT id, start_time, end_time FROM slots WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", 
      [slotId]
    );
    // Reject if the slot doesn't exist or was soft-deleted
    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new BookingNotFoundError("Slot not found");
    }

    // Server-side guard against booking an elapsed slot
    if (new Date(slotResult.rows[0].start_time) <= new Date()) {
      await client.query("ROLLBACK");
      throw new BookingConflictError("This slot has already passed");
    }

    // Check if the slot is already booked
    const existing = await client.query(
      `SELECT id FROM bookings
       WHERE slot_id = $1 AND status IN ('confirmed', 'completed') AND deleted_at IS NULL`,
      [slotId]
    );

    // throw an error if the slot is already booked
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new BookingConflictError("This slot is already booked");
    }

    // Check if the slot is overlapping with any existing bookings, if so throw an error
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

    // Create the booking
    const insertResult = await client.query(
      `INSERT INTO bookings (slot_id, patient_id, status, notes)
       VALUES ($1, $2, 'confirmed', $3)
       RETURNING id, slot_id, patient_id, status, notes, created_at`,
      [slotId, patientId, notes]
    );

    // Commit the transaction
    await client.query("COMMIT");
    // Return the booking
    return insertResult.rows[0];
  } catch (err: any) {
    // Rollback the transaction if an error occurs
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
  // Select all upcoming bookings for the patient with the doctor details sorted by start time
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at, b.notes,
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

  // Select all past bookings for the patient with the doctor details sorted by start time
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at, b.notes,
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

  // Select all booked times for the patient on a given date
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

  // Cancel the booking
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND patient_id = $2 AND status = 'confirmed' AND deleted_at IS NULL`,
    [bookingId, patientId]
  );
  if (result.rowCount === 0) {
    throw new BookingNotFoundError("Booking not found");
  }
}

// date: SGT local date string "YYYY-MM-DD". Defaults to today (SGT).
export async function getDoctorUpcoming(doctorId: number, date?: string) {

  const sgDate = date ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });

  // Select all upcoming bookings for the doctor with the patient details sorted by start time
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at, b.notes,
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
       AND date_trunc('day', s.start_time AT TIME ZONE 'Asia/Singapore') = $2::date
       AND b.deleted_at IS NULL
     ORDER BY s.start_time ASC`,
    [doctorId, sgDate]
  );
  return result.rows;
}

export async function getDoctorPast(doctorId: number) {

  // Select all past bookings for the doctor with the patient details sorted by start time
  const result = await pool.query(
    `SELECT
       b.id, b.status, b.created_at, b.notes,
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

// Returns distinct SGT dates ("YYYY-MM-DD") that have at least one confirmed
// booking for the doctor in the given year-month (e.g. "2026-07").
export async function getDoctorBookedDatesInMonth(doctorId: number, yearMonth: string) {

  // Select all distinct SGT dates that have at least one confirmed booking for the doctor in the given year-month
  const result = await pool.query<{ date: string }>(
    `SELECT DISTINCT
       to_char(s.start_time AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS date
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     WHERE s.doctor_id = $1
       AND b.status = 'confirmed'
       AND b.deleted_at IS NULL
       AND to_char(s.start_time AT TIME ZONE 'Asia/Singapore', 'YYYY-MM') = $2
     ORDER BY date`,
    [doctorId, yearMonth]
  );
  return result.rows.map((r) => r.date);
}

export async function completeBooking(bookingId: number, doctorId: number) {

  // Doctor marks the appointment as completed as a form of conclusion of the consultation
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
