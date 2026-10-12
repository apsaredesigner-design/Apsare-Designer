"use client";
/**
 * AdminSessionProvider + useAdminSession: the client-side admin auth gate.
 *
 * Mounted by app/admin/(panel)/layout.tsx. On mount it calls GET /api/auth/me:
 *   - 401          → /admin/login?next=<current path>
 *   - not an ADMIN → /admin/login?reason=forbidden
 *   - network/5xx  → an error card with "Try again"
 * Children render only once an admin is confirmed. The server still enforces the role
 * on every /api/admin call; proxy.ts only checks that the cookie exists.
 *
 *   const { user, logout } = useAdminSession();
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/admin/api";
import { errorMessage, isAbortError, toApiError } from "@/lib/admin/errors";
import type { User } from "@/types";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./icons";

interface Session {
  user: User;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useAdminSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAdminSession must be used inside <AdminSessionProvider>");
  return ctx;
}

type State = { status: "loading" } | { status: "ready"; user: User } | { status: "error"; message: string } | { status: "redirecting" };

export function loginUrl(reason?: "forbidden" | "expired") {
  const next = typeof window === "undefined" ? "/admin/dashboard" : window.location.pathname + window.location.search;
  const sp = new URLSearchParams({ next });
  if (reason) sp.set("reason", reason);
  return `/admin/login?${sp}`;
}

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authApi.me({ signal: controller.signal }).then(
      ({ user }) => {
        if (user.role === "ADMIN") return setState({ status: "ready", user });
        setState({ status: "redirecting" });
        router.replace(loginUrl("forbidden"));
      },
      (e: unknown) => {
        if (controller.signal.aborted || isAbortError(e)) return;
        const err = toApiError(e);
        if (err.status === 401) {
          setState({ status: "redirecting" });
          router.replace(loginUrl());
        } else {
          setState({ status: "error", message: errorMessage(err) });
        }
      },
    );
    return () => controller.abort();
  }, [attempt, router]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  }, [router]);

  if (state.status === "ready") {
    return <SessionContext.Provider value={{ user: state.user, logout }}>{children}</SessionContext.Provider>;
  }

  if (state.status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory p-6">
        <EmptyState
          tone="error"
          title="Couldn't check your session"
          description={state.message}
          action={
            <Button
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-ivory text-ink/60">
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-2xl tracking-[0.2em] text-ink">APSÁRE</p>
        <p className="flex items-center gap-2 text-sm">
          <Spinner /> {state.status === "redirecting" ? "Redirecting to sign in…" : "Checking your session…"}
        </p>
      </div>
    </div>
  );
}
