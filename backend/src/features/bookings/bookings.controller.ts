import type { Request, Response } from "express";
import {
  createBooking,
  getPatientUpcoming,
  getPatientPast,
  getPatientBookedTimes,
  cancelBooking,
  getDoctorUpcoming,
  getDoctorPast,
  completeBooking,
  BookingConflictError,
  BookingNotFoundError,
} from "./bookings.service";

export async function handleCreateBooking(req: Request, res: Response) {
  const { slotId } = req.body;
  if (!slotId) {
    return res.status(400).json({ error: "slotId is required" });
  }
  try {
    const booking = await createBooking(slotId, req.user!.id);
    return res.status(201).json({ booking });
  } catch (err) {
    if (err instanceof BookingConflictError) return res.status(409).json({ error: err.message });
    if (err instanceof BookingNotFoundError) return res.status(404).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function handleGetPatientUpcoming(req: Request, res: Response) {
  const bookings = await getPatientUpcoming(req.user!.id);
  return res.json({ bookings });
}

export async function handleGetPatientPast(req: Request, res: Response) {
  const bookings = await getPatientPast(req.user!.id);
  return res.json({ bookings });
}

export async function handleGetBookedTimes(req: Request, res: Response) {
  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
  }
  const bookedTimes = await getPatientBookedTimes(req.user!.id, date);
  return res.json({ bookedTimes });
}

export async function handleCancelBooking(req: Request, res: Response) {
  try {
    await cancelBooking(Number(req.params.id), req.user!.id);
    return res.json({ message: "Booking cancelled" });
  } catch (err) {
    if (err instanceof BookingNotFoundError) return res.status(404).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function handleGetDoctorUpcoming(req: Request, res: Response) {
  const bookings = await getDoctorUpcoming(req.user!.id);
  return res.json({ bookings });
}

export async function handleGetDoctorPast(req: Request, res: Response) {
  const bookings = await getDoctorPast(req.user!.id);
  return res.json({ bookings });
}

export async function handleCompleteBooking(req: Request, res: Response) {
  try {
    await completeBooking(Number(req.params.id), req.user!.id);
    return res.json({ message: "Booking marked as completed" });
  } catch (err) {
    if (err instanceof BookingNotFoundError) return res.status(404).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
