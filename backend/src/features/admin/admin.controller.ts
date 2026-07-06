import type { Request, Response } from "express";
import { listUsers, getUserBookings } from "./admin.service";
import type { UserRole } from "../../middleware/auth";

const VALID_ROLES: UserRole[] = ["patient", "doctor", "admin"];

export async function handleListUsers(req: Request, res: Response) {
  const { role } = req.query;
  if (role !== undefined) {
    if (typeof role !== "string" || !VALID_ROLES.includes(role as UserRole)) {
      return res.status(400).json({ error: "role must be one of: patient, doctor, admin" });
    }
  }
  const users = await listUsers(role as UserRole | undefined);
  return res.json({ users });
}

export async function handleGetUserBookings(req: Request, res: Response) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid user id" });
  }
  const bookings = await getUserBookings(userId);
  return res.json({ bookings });
}
