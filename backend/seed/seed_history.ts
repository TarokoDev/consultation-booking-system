import "dotenv/config";
import { pool } from "../src/db";

// Seeds past slots (last 21 days) + historical bookings in all three statuses.
// Safe to run against existing DB — uses ON CONFLICT DO NOTHING for slots,
// and skips booking if the slot already has an active booking.
async function seedHistory() {
  // Past slot window: 21 days ago through yesterday (SGT wall-clock).
  const PAST_WINDOW = `generate_series(
    date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') - interval '21 days',
    date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') - interval '1 day',
    interval '1 day'
  ) AS day`;

  // Weekday mornings: 08:00–12:30 (10 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '8 hours'  + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '8 hours'  + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${PAST_WINDOW}, generate_series(0, 9) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) BETWEEN 1 AND 5
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  // Weekday afternoons: 14:00–16:30 (6 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '14 hours' + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '14 hours' + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${PAST_WINDOW}, generate_series(0, 5) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) BETWEEN 1 AND 5
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  // Saturday mornings: 08:00–12:30 (10 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '8 hours'  + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '8 hours'  + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${PAST_WINDOW}, generate_series(0, 9) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) = 6
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  console.log("Inserted past slots (21-day lookback, SG clinic hours)");

  // Fetch all patients and doctors by ID.
  const { rows: patients } = await pool.query<{ id: number; first_name: string; last_name: string }>(
    "SELECT id, first_name, last_name FROM users WHERE role = 'patient' ORDER BY id"
  );
  const { rows: doctors } = await pool.query<{ id: number; first_name: string; last_name: string }>(
    "SELECT id, first_name, last_name FROM users WHERE role = 'doctor' ORDER BY id"
  );

  console.log(`Patients: ${patients.map(p => `${p.first_name} (${p.id})`).join(', ')}`);
  console.log(`Doctors:  ${doctors.map(d => `${d.first_name} (${d.id})`).join(', ')}`);

  // Fetch all past slots grouped by doctor, ordered by start time.
  const { rows: pastSlots } = await pool.query<{ id: number; doctor_id: number; start_time: Date }>(
    `SELECT id, doctor_id, start_time
     FROM slots
     WHERE start_time < now()
     ORDER BY doctor_id, start_time`
  );

  console.log(`Total past slots available: ${pastSlots.length}`);

  // Build bookings: spread across patients/doctors with a realistic mix of statuses.
  // Strategy: pick evenly-spaced slots per doctor, rotating through patients and statuses.
  // Statuses rotate: completed (most), cancelled (some), confirmed is for future only.
  // All past bookings that are still 'confirmed' are also valid (e.g. no-shows we don't model).
  const STATUS_ROTATION: Array<"completed" | "cancelled" | "confirmed"> = [
    "completed", "completed", "completed", "cancelled",
    "completed", "completed", "cancelled", "completed",
    "confirmed", "completed", "cancelled", "completed",
  ];

  const bookings: Array<{ slot_id: number; patient_id: number; status: string }> = [];

  // Group slots by doctor
  const slotsByDoctor = new Map<number, typeof pastSlots>();
  for (const slot of pastSlots) {
    const arr = slotsByDoctor.get(slot.doctor_id) ?? [];
    arr.push(slot);
    slotsByDoctor.set(slot.doctor_id, arr);
  }

  let patientIdx = 0;
  let statusIdx = 0;

  for (const [, slots] of slotsByDoctor) {
    // Pick every 3rd slot to avoid filling every single slot (leave some unbooked — realistic).
    for (let i = 0; i < slots.length; i += 3) {
      const slot = slots[i];
      const patient = patients[patientIdx % patients.length];
      const status = STATUS_ROTATION[statusIdx % STATUS_ROTATION.length];

      bookings.push({ slot_id: slot.id, patient_id: patient.id, status });

      patientIdx++;
      statusIdx++;
    }
  }

  // Insert bookings, skipping slots that already have an active booking (partial unique index).
  let inserted = 0;
  let skipped = 0;
  for (const b of bookings) {
    try {
      await pool.query(
        `INSERT INTO bookings (slot_id, patient_id, status) VALUES ($1, $2, $3)`,
        [b.slot_id, b.patient_id, b.status]
      );
      inserted++;
    } catch (err: unknown) {
      // Unique constraint violation = slot already booked, skip silently.
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`Bookings inserted: ${inserted}, skipped (already booked): ${skipped}`);
  console.log(`Status breakdown: completed/cancelled/confirmed mixed per STATUS_ROTATION`);

  await pool.end();
}

seedHistory().catch((err) => {
  console.error(err);
  process.exit(1);
});
