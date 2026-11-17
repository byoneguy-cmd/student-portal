"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEMO_USER,
  MOCK_MODE,
  MOCK_TOKEN,
  getToken,
  loginWithCredentials,
  setToken,
  type Role,
  type User,
} from "./api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  roles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  mockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithNcalayer: () => Promise<void>;
  loginWithEgov: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Инициализация сессии: восстанавливаем токен из localStorage.
  // В mock-режиме «сажаем» демо-студента, если пользователь открыл не /login,
  // чтобы дашборд сразу был наполнен данными (демо-режим).
  useEffect(() => {
    const stored = getToken();
    if (stored) {
      setTokenState(stored);
      setUser(DEMO_USER);
    } else if (MOCK_MODE && pathname !== "/login") {
      setToken(MOCK_TOKEN);
      setTokenState(MOCK_TOKEN);
      setUser(DEMO_USER);
    }
    setIsLoading(false);
  }, [pathname]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginWithCredentials(email, password);
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithNcalayer = useCallback(async () => {
    setIsLoading(true);
    try {
      await delay(800); // имитация обращения к локальному агенту NCALayer
      setToken(MOCK_TOKEN);
      setTokenState(MOCK_TOKEN);
      setUser(DEMO_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithEgov = useCallback(async () => {
    setIsLoading(true);
    try {
      await delay(1200); // имитация сканирования QR в eGov Mobile
      setToken(MOCK_TOKEN);
      setTokenState(MOCK_TOKEN);
      setUser(DEMO_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      roles: user ? [user.role] : [],
      isAuthenticated: Boolean(user),
      isLoading,
      mockMode: MOCK_MODE,
      login,
      loginWithNcalayer,
      loginWithEgov,
      logout,
    }),
    [user, token, isLoading, login, loginWithNcalayer, loginWithEgov, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  }
  return ctx;
}
