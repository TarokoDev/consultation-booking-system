export type Role = "patient" | "doctor" | "admin";

export interface User {
  id: number;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: Role;
}

export interface Doctor {
  id: number;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  specialty: string | null;
}

export interface Slot {
  id: number;
  start_time: string;
}

export interface Booking {
  id: number;
  slot_id: number;
  patient_id: number;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
}
