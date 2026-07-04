export type Role = "patient" | "doctor" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}
