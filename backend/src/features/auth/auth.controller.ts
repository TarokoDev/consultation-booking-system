import type { Request, Response } from "express";
import { loginUser, getMe } from "./auth.service";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { token, user } = await loginUser(email, password);
    return res.json({ user, token });
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ error: err.message });
  }
}

export function logout(req: Request, res: Response) {
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await getMe(req.user!.id);
  return res.json({ user });
}
