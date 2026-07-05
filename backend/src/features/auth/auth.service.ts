import bcrypt from "bcryptjs";
import { pool } from "../../db";
import { signToken } from "../../middleware/auth";
import type { UserRole } from "../../middleware/auth";

export interface UserRow {
  id: number;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: UserRole;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: UserRow }> {
  const result = await pool.query(
    "SELECT id, title, first_name, middle_name, last_name, email, password_hash, role FROM users WHERE email = $1",
    [email]
  );
  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const token = signToken({ id: row.id, role: row.role });
  const user: UserRow = {
    id: row.id,
    title: row.title,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role,
  };
  return { token, user };
}

export async function getMe(userId: number): Promise<UserRow> {
  const result = await pool.query(
    "SELECT id, title, first_name, middle_name, last_name, email, role FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0];
}
