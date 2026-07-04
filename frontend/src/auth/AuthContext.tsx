import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const { user } = await api.getMe();
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  async function login(email: string, password: string) {
    const { user } = await api.login(email, password);
    setUser(user);
    return user;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  const value: AuthContextValue = { user, isLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
