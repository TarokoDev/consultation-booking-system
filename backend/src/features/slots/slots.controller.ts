import type { Request, Response } from "express";
import { getAvailableSlots } from "./slots.service";

export async function getSlots(req: Request, res: Response) {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) {
    return res.status(400).json({ error: "doctorId and date are required" });
  }
  const slots = await getAvailableSlots(doctorId as string, date as string);
  return res.json({ slots });
}
