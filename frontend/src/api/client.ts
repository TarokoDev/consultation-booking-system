import axios from "axios";
import type { User } from "./types";

export class ApiError extends Error {}

const http = axios.create({
  withCredentials: true,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? "Something went wrong";
    throw new ApiError(message);
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
