// ============================================================================
// Consultation Booking System — seed script
//
// Two modes, wired to two npm scripts:
//
//   npm run seed            -> FULL WIPE, then seed users + future slots
//   npm run seed:history    -> ADDITIVE: past slots + historical bookings
//                              (run AFTER `npm run seed`; does not wipe)
//
// Run order matters: `seed` truncates everything, so always run it first and
// `seed:history` second if you want history data.
// ============================================================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db";

// ----------------------------------------------------------------------------
// Config: demo users
//
// 1 admin, 3 doctors, 5 patients. All share the password below — these are
// throwaway demo credentials for a preseeded assessment app, never real ones.
// ----------------------------------------------------------------------------

const DEMO_PASSWORD = "password123";

const SEED_USERS = [
  { title: null, first_name: "Carol", middle_name: null, last_name: "Ng", email: "carol_ng@godoc.test", role: "admin", specialty: null },

  { title: "Dr.", first_name: "Pamela", middle_name: null, last_name: "Goh", email: "pamela_goh@godoc.test", role: "doctor", specialty: "General Practice" },
  { title: "Dr.", first_name: "Wei Ming", middle_name: null, last_name: "Tan", email: "wei_ming_tan@godoc.test", role: "doctor", specialty: "Cardiology" },
  { title: "Dr.", first_name: "Sarah", middle_name: null, last_name: "Lim", email: "sarah_lim@godoc.test", role: "doctor", specialty: "Pediatrics" },

  { title: null, first_name: "Alice", middle_name: null, last_name: "Goh", email: "alice_goh@godoc.test", role: "patient", specialty: null },
  { title: null, first_name: "Marcus", middle_name: null, last_name: "Lim", email: "marcus_lim@godoc.test", role: "patient", specialty: null },
  { title: null, first_name: "Priya", middle_name: null, last_name: "Nair", email: "priya_nair@godoc.test", role: "patient", specialty: null },
  { title: null, first_name: "Daniel", middle_name: null, last_name: "Wong", email: "daniel_wong@godoc.test", role: "patient", specialty: null },
  { title: null, first_name: "Nurul", middle_name: null, last_name: "Aisyah", email: "nurul_aisyah@godoc.test", role: "patient", specialty: null },
];

// ----------------------------------------------------------------------------
// Config: clinic hours
//
// Standard SG clinic week — Mon–Fri 08:00–13:00 and 14:00–17:00 (lunch break
// in between), Sat 08:00–13:00, closed Sunday. 30-minute slot blocks.
//
// Each shift is data: which days it applies to (Postgres DOW: 1=Mon .. 6=Sat),
// what hour it starts (SGT wall clock), and how many 30-min slots it holds.
// One generator below turns these into slot rows for any date window, so the
// same definitions drive both future slots (booking) and past slots (history).
// ----------------------------------------------------------------------------

const SLOT_MINUTES = 30;

const SHIFTS = [
  { label: "weekday mornings",   dowCondition: "EXTRACT(DOW FROM day) BETWEEN 1 AND 5", startHour: 8,  slotCount: 10 }, // 08:00–12:30 starts
  { label: "weekday afternoons", dowCondition: "EXTRACT(DOW FROM day) BETWEEN 1 AND 5", startHour: 14, slotCount: 6  }, // 14:00–16:30 starts
  { label: "saturday mornings",  dowCondition: "EXTRACT(DOW FROM day) = 6",             startHour: 8,  slotCount: 10 }, // 08:00–12:30 starts
];

// ----------------------------------------------------------------------------
// Slot generation
//
// Timezone note (important): `day` is a naive timestamp representing SGT
// wall-clock midnight (via `now() AT TIME ZONE 'Asia/Singapore'`). Each
// slot's wall-clock time is built on top of that naive value, then the whole
// expression is converted back with `AT TIME ZONE 'Asia/Singapore'` so the
// stored TIMESTAMPTZ is the correct UTC instant for "08:00 in Singapore" —
// not "08:00 UTC", which would render as 4:00 PM in a Singapore browser.
//
// ON CONFLICT (doctor_id, start_time) DO NOTHING makes generation idempotent:
// re-running only fills gaps, never duplicates.
// ----------------------------------------------------------------------------

// `windowSql` must be a generate_series(...) aliased AS day, yielding naive
// SGT wall-clock midnights.
async function insertShiftSlots(windowSql: string) {
  for (const shift of SHIFTS) {
    await pool.query(`
      INSERT INTO slots (doctor_id, start_time, end_time)
      SELECT d.id,
             (day + interval '${shift.startHour} hours' + (n * interval '${SLOT_MINUTES} minutes')) AT TIME ZONE 'Asia/Singapore',
             (day + interval '${shift.startHour} hours' + (n * interval '${SLOT_MINUTES} minutes') + interval '${SLOT_MINUTES} minutes') AT TIME ZONE 'Asia/Singapore'
      FROM users d, ${windowSql}, generate_series(0, ${shift.slotCount - 1}) AS n
      WHERE d.role = 'doctor' AND ${shift.dowCondition}
      ON CONFLICT (doctor_id, start_time) DO NOTHING
    `);
  }
}

// Future window: today through +20 days (3 weeks of bookable slots).
const FUTURE_WINDOW = `generate_series(
  date_trunc('day', now() AT TIME ZONE 'Asia/Singapore'),
  date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') + interval '20 days',
  interval '1 day'
) AS day`;

// Past window: 21 days ago through yesterday (for booking history).
const PAST_WINDOW = `generate_series(
  date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') - interval '21 days',
  date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') - interval '1 day',
  interval '1 day'
) AS day`;

// ----------------------------------------------------------------------------
// Mode 1: base seed (npm run seed)
//
// Full wipe, then users and future slots. TRUNCATE lists tables in FK
// dependency order (bookings -> slots -> users); RESTART IDENTITY resets the
// serial ids so reseeded data is deterministic.
// ----------------------------------------------------------------------------

async function seedBase() {
  await pool.query("TRUNCATE bookings, slots, users RESTART IDENTITY CASCADE");

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (title, first_name, middle_name, last_name, email, password_hash, role, specialty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user.title, user.first_name, user.middle_name, user.last_name, user.email, passwordHash, user.role, user.specialty]
    );
    console.log(`Seeded ${user.role}: ${user.email}`);
  }

  await insertShiftSlots(FUTURE_WINDOW);
  console.log("Seeded future slots for all doctors (SG clinic hours, 3-week window, 30-min blocks)");
}

// ----------------------------------------------------------------------------
// Mode 2: history seed (npm run seed:history)
//
// Additive — assumes users already exist (run `npm run seed` first). Inserts
// past slots (last 21 days), then a realistic spread of historical bookings
// so the patient/doctor History tabs have content to show.
// ----------------------------------------------------------------------------

// Rotation gives a realistic mix: mostly completed, some cancelled, the odd
// past booking still 'confirmed' (a no-show — we don't model those further).
const STATUS_ROTATION: Array<"completed" | "cancelled" | "confirmed"> = [
  "completed", "completed", "completed", "cancelled",
  "completed", "completed", "cancelled", "completed",
  "confirmed", "completed", "cancelled", "completed",
];

async function seedHistory() {
  await insertShiftSlots(PAST_WINDOW);
  console.log("Inserted past slots (21-day lookback, SG clinic hours)");

  const { rows: patients } = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE role = 'patient' ORDER BY id"
  );
  if (patients.length === 0) {
    throw new Error("No patients found — run `npm run seed` before `npm run seed:history`.");
  }

  const { rows: pastSlots } = await pool.query<{ id: number; doctor_id: number }>(
    `SELECT id, doctor_id
     FROM slots
     WHERE start_time < now()
     ORDER BY doctor_id, start_time`
  );
  console.log(`Total past slots available: ${pastSlots.length}`);

  // Group past slots by doctor, then book every 3rd slot per doctor, rotating
  // through patients and statuses. Skipping 2 of every 3 leaves realistic
  // gaps — a fully-booked history would look synthetic.
  const slotsByDoctor = new Map<number, typeof pastSlots>();
  for (const slot of pastSlots) {
    const arr = slotsByDoctor.get(slot.doctor_id) ?? [];
    arr.push(slot);
    slotsByDoctor.set(slot.doctor_id, arr);
  }

  const bookings: Array<{ slot_id: number; patient_id: number; status: string }> = [];
  let patientIdx = 0;
  let statusIdx = 0;

  for (const [, slots] of slotsByDoctor) {
    for (let i = 0; i < slots.length; i += 3) {
      bookings.push({
        slot_id: slots[i].id,
        patient_id: patients[patientIdx % patients.length].id,
        status: STATUS_ROTATION[statusIdx % STATUS_ROTATION.length],
      });
      patientIdx++;
      statusIdx++;
    }
  }

  // Insert one by one; the one_active_booking_per_slot partial unique index
  // rejects slots that already hold an active booking (error 23505) — those
  // are skipped, which makes history seeding safe to re-run.
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
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        skipped++;
      } else {
        throw err;
      }
    }
  }
  console.log(`Bookings inserted: ${inserted}, skipped (already booked): ${skipped}`);
}

// ----------------------------------------------------------------------------
// Entry point — mode chosen by CLI flag (see npm scripts in package.json).
// ----------------------------------------------------------------------------

async function main() {
  const historyMode = process.argv.includes("--history");
  if (historyMode) {
    await seedHistory();
  } else {
    await seedBase();
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
