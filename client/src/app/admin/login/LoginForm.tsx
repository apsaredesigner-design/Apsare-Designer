"use client";
/**
 * Admin sign-in form: POST /api/auth/admin/login { identifier, password, remember }.
 * Shows field errors (400), one generic message for bad credentials (401), a friendly
 * rate-limit message (429), and redirects to a safe `?next=` (default /admin/dashboard).
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { FormField } from "@/components/admin/FormField";
import { EyeIcon, EyeOffIcon, WarningIcon } from "@/components/admin/icons";
import { Input } from "@/components/admin/Input";
import { cx, focusRing } from "@/components/admin/styles";
import { authApi } from "@/lib/admin/api";
import { toApiError } from "@/lib/admin/errors";

/** Only same-site admin paths; anything else falls back to the dashboard. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\") || next.startsWith("/admin/login")) {
    return "/admin/dashboard";
  }
  return next;
}

function messageFor(status: number, code: string | undefined, fallback: string): string {
  if (status === 401) return "Those details don't match an admin account. Check your email or mobile and password.";
  if (status === 403 && code === "ACCOUNT_DISABLED") return "This account has been disabled. Please contact the store owner.";
  if (status === 429) return "Too many sign-in attempts. For your security, please wait about 15 minutes and try again.";
  if (status === 0) return "We couldn't reach the server. Check your connection and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return fallback;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const reason = params.get("reason");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Already signed in as an admin? Skip the form.
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me({ signal: controller.signal })
      .then(({ user }) => {
        if (user.role === "ADMIN") router.replace(next);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [next, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.identifier = "Enter your email or mobile number.";
    if (!password) errs.password = "Enter your password.";
    setFieldErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      document.getElementById(errs.identifier ? "admin-identifier" : "admin-password")?.focus();
      return;
    }

    setPending(true);
    try {
      await authApi.adminLogin({ identifier: identifier.trim(), password, remember });
      router.replace(next);
      router.refresh();
    } catch (e) {
      const err = toApiError(e);
      if (err.code === "VALIDATION_ERROR" && err.details.length) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFormError(messageFor(err.status, err.code, err.message));
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5" aria-describedby={formError ? "admin-login-error" : undefined}>
      {reason === "forbidden" && !formError && (
        <p role="status" className="flex gap-2 rounded-md border border-gold-400/40 bg-gold-300/15 px-3 py-2.5 text-sm text-gold-700">
          <WarningIcon className="mt-0.5 size-4 shrink-0" />
          That account doesn&apos;t have admin access. Sign in with an admin account.
        </p>
      )}
      {formError && (
        <p id="admin-login-error" role="alert" className="flex gap-2 rounded-md border border-sale/25 bg-sale/5 px-3 py-2.5 text-sm text-sale">
          <WarningIcon className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      )}

      <FormField label="Email or mobile" name="identifier" errors={fieldErrors} id="admin-identifier" required>
        <Input
          name="identifier"
          type="text"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoFocus
        />
      </FormField>

      <FormField label="Password" name="password" errors={fieldErrors} id="admin-password" required>
        <Input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className={cx("grid size-11 place-items-center rounded-md text-ink/50 hover:text-ink", focusRing)}
            >
              {showPassword ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
            </button>
          }
        />
      </FormField>

      <Checkbox label="Keep me signed in for 30 days" checked={remember} onChange={(e) => setRemember(e.target.checked)} />

      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-xs text-ink/45">Customer? Sign in on the storefront instead.</p>
    </form>
  );
}
