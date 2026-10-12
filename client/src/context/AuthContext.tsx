"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { emailOrMobile: string; password: string; remember?: boolean }) => Promise<User>;
  signup: (data: { fullName: string; email: string; mobile: string; password: string; remember?: boolean }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api<{ user: User }>("/auth/me");
      setUser(res.user);
      return res.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/auth/me")
      .then((res) => {
        if (active) setUser(res.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async ({ emailOrMobile, ...rest }: { emailOrMobile: string; password: string; remember?: boolean }) => {
    // The API takes one `identifier` (email or mobile), not `emailOrMobile`.
    const res = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: emailOrMobile, ...rest }),
    });
    setUser(res.user);
    return res.user;
  };

  const signup = async (data: { fullName: string; email: string; mobile: string; password: string; remember?: boolean }) => {
    const res = await api<{ user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
