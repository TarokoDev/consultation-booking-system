import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db";

const SEED_USERS = [
  { title: null, first_name: "Carol", middle_name: null, last_name: "Ng", email: "carol_ng@godoc.test", password: "password123", role: "admin", specialty: null },

  { title: "Dr.", first_name: "Pamela", middle_name: null, last_name: "Goh", email: "pamela_goh@godoc.test", password: "password123", role: "doctor", specialty: "General Practice" },
  { title: "Dr.", first_name: "Wei Ming", middle_name: null, last_name: "Tan", email: "wei_ming_tan@godoc.test", password: "password123", role: "doctor", specialty: "Cardiology" },
  { title: "Dr.", first_name: "Sarah", middle_name: null, last_name: "Lim", email: "sarah_lim@godoc.test", password: "password123", role: "doctor", specialty: "Pediatrics" },

  { title: null, first_name: "Alice", middle_name: null, last_name: "Goh", email: "alice_goh@godoc.test", password: "password123", role: "patient", specialty: null },
  { title: null, first_name: "Marcus", middle_name: null, last_name: "Lim", email: "marcus_lim@godoc.test", password: "password123", role: "patient", specialty: null },
  { title: null, first_name: "Priya", middle_name: null, last_name: "Nair", email: "priya_nair@godoc.test", password: "password123", role: "patient", specialty: null },
  { title: null, first_name: "Daniel", middle_name: null, last_name: "Wong", email: "daniel_wong@godoc.test", password: "password123", role: "patient", specialty: null },
  { title: null, first_name: "Nurul", middle_name: null, last_name: "Aisyah", email: "nurul_aisyah@godoc.test", password: "password123", role: "patient", specialty: null },
];

async function seed() {
  // Full wipe - clean slate each run. FK order: bookings -> slots -> users.
  await pool.query("TRUNCATE bookings, slots, users RESTART IDENTITY CASCADE");

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (title, first_name, middle_name, last_name, email, password_hash, role, specialty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user.title, user.first_name, user.middle_name, user.last_name, user.email, passwordHash, user.role, user.specialty]
    );
    console.log(`Seeded ${user.role}: ${user.email}`);
  }

  // Standard SG clinic hours: Mon-Fri 08:00-13:00 + 14:00-17:00 (lunch
  // break), Sat 08:00-13:00, closed Sunday. 30-min blocks, 3-week window
  // (today through +20 days).
  //
  // `day` is computed as a naive timestamp representing SGT wall-clock
  // midnight (via `now() AT TIME ZONE 'Asia/Singapore'`). Each slot's
  // wall-clock time is built on top of that naive value, then the whole
  // expression is converted back with `AT TIME ZONE 'Asia/Singapore'` so
  // the stored TIMESTAMPTZ is the correct UTC instant for "08:00 in
  // Singapore" rather than "08:00 UTC" (which would render as 4:00 PM
  // in a Singapore-local browser).
  const WINDOW = `generate_series(date_trunc('day', now() AT TIME ZONE 'Asia/Singapore'), date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') + interval '20 days', interval '1 day') AS day`;

  // Weekday mornings: 08:00-12:30 start (10 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '8 hours' + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '8 hours' + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${WINDOW}, generate_series(0, 9) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) BETWEEN 1 AND 5
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  // Weekday afternoons: 14:00-16:30 start (6 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '14 hours' + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '14 hours' + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${WINDOW}, generate_series(0, 5) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) BETWEEN 1 AND 5
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  // Saturday mornings: 08:00-12:30 start (10 slots)
  await pool.query(`
    INSERT INTO slots (doctor_id, start_time, end_time)
    SELECT d.id,
           (day + interval '8 hours' + (n * interval '30 minutes')) AT TIME ZONE 'Asia/Singapore',
           (day + interval '8 hours' + (n * interval '30 minutes') + interval '30 minutes') AT TIME ZONE 'Asia/Singapore'
    FROM users d, ${WINDOW}, generate_series(0, 9) AS n
    WHERE d.role = 'doctor' AND EXTRACT(DOW FROM day) = 6
    ON CONFLICT (doctor_id, start_time) DO NOTHING
  `);

  console.log("Seeded slots for all doctors (SG clinic hours, 3-week window, 30-min blocks)");

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
