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
  end_time: string;
}

export interface Booking {
  id: number;
  slot_id: number;
  patient_id: number;
  status: "confirmed" | "cancelled" | "completed";
  notes: string;
  created_at: string;
}

export interface BookingWithSlot {
  id: number;
  status: "confirmed" | "cancelled" | "completed";
  notes: string;
  created_at: string;
  slot_id: number;
  start_time: string;
  end_time: string;
  doctor_id: number;
  doctor_title: string | null;
  doctor_first_name: string;
  doctor_middle_name: string | null;
  doctor_last_name: string;
  doctor_specialty: string | null;
}

export interface DoctorBookingView {
  id: number;
  status: "confirmed" | "cancelled" | "completed";
  notes: string;
  created_at: string;
  slot_id: number;
  start_time: string;
  end_time: string;
  patient_id: number;
  patient_title: string | null;
  patient_first_name: string;
  patient_middle_name: string | null;
  patient_last_name: string;
}
