import type { Request, Response } from "express";
import { listDoctors } from "./doctors.service";

export async function getDoctors(req: Request, res: Response) {
  const doctors = await listDoctors();
  return res.json({ doctors });
}
