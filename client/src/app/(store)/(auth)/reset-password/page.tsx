"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing or invalid. Please request a new link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setIsSuccess(true);
      toast.success("Password reset successfully! Please sign in.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid or expired reset token.");
      } else {
        const message = err instanceof Error ? err.message : "Failed to reset password.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-sage-200 bg-white p-6 sm:p-8 shadow-sm">
        {isSuccess ? (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-sage-600 mb-3" />
            <h2 className="font-display text-2xl font-semibold text-ink">
              Password Changed
            </h2>
            <p className="mt-2 text-xs text-ink/70 leading-relaxed">
              Your password has been securely updated. You can now sign in with
              your new credentials.
            </p>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
                Choose New Password
              </h1>
              <p className="mt-2 text-xs text-ink/65">
                Enter your new password below (min. 8 characters with letters & numbers).
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-ink/40 hover:text-ink cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                label="Confirm New Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
