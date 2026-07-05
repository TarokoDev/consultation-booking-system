import type { Request, Response } from "express";
import { loginUser, getMe } from "./auth.service";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { token, user } = await loginUser(email, password);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({ user });
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function logout(req: Request, res: Response) {
  res.clearCookie("token");
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await getMe(req.user!.id);
  return res.json({ user });
}
