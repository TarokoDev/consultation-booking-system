import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db";

const SEED_USERS = [
  { name: "Alice Patient", email: "patient@godoc.test", password: "password123", role: "patient" },
  { name: "Dr. Bob Doctor", email: "doctor@godoc.test", password: "password123", role: "doctor" },
  { name: "Carol Admin", email: "admin@godoc.test", password: "password123", role: "admin" },
];

async function seed() {
  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, passwordHash, user.role]
    );
    console.log(`Seeded ${user.role}: ${user.email}`);
  }
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
