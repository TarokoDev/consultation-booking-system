import axios from "axios";
import type { Booking, BookingWithSlot, DoctorBookingView, Doctor, Slot, User } from "./types";

export class ApiError extends Error {
  status?: number;
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? "Something went wrong";
    const apiError = new ApiError(message);
    apiError.status = err.response?.status;
    throw apiError;
  }
);

export async function login(email: string, password: string) {
  const res = await http.post<{ user: User }>("/auth/login", { email, password });
  return res.data;
}

export async function logout() {
  const res = await http.post<{ ok: true }>("/auth/logout");
  return res.data;
}

export async function getMe() {
  const res = await http.get<{ user: User }>("/auth/me");
  return res.data;
}

export async function getDoctors() {
  const res = await http.get<{ doctors: Doctor[] }>("/doctors");
  return res.data;
}

export async function getSlots(doctorId: number, date: string) {
  const res = await http.get<{ slots: Slot[] }>("/slots", { params: { doctorId, date } });
  return res.data;
}

export async function createBooking(slotId: number, notes: string) {
  const res = await http.post<{ booking: Booking }>("/bookings", { slotId, notes });
  return res.data;
}

export async function getPatientUpcomingBookings() {
  const res = await http.get<{ bookings: BookingWithSlot[] }>("/bookings/patient/upcoming");
  return res.data;
}

export async function cancelBooking(id: number) {
  const res = await http.patch<{ message: string }>(`/bookings/patient/${id}/cancel`);
  return res.data;
}

export async function getBookedTimes(date: string) {
  const res = await http.get<{ bookedTimes: { start_time: string; end_time: string }[] }>(
    "/bookings/patient/booked-times",
    { params: { date } }
  );
  return res.data;
}

export async function getPatientPastBookings() {
  const res = await http.get<{ bookings: BookingWithSlot[] }>("/bookings/patient/past");
  return res.data;
}

export async function getDoctorBookedDates(month: string) {
  const res = await http.get<{ dates: string[] }>("/bookings/doctor/booked-dates", { params: { month } });
  return res.data;
}

export async function getDoctorUpcomingBookings(date?: string) {
  const res = await http.get<{ bookings: DoctorBookingView[] }>("/bookings/doctor/upcoming", {
    params: date ? { date } : undefined,
  });
  return res.data;
}

export async function getDoctorPastBookings() {
  const res = await http.get<{ bookings: DoctorBookingView[] }>("/bookings/doctor/past");
  return res.data;
}

export async function markBookingComplete(id: number) {
  const res = await http.patch<{ message: string }>(`/bookings/doctor/${id}/complete`);
  return res.data;
}