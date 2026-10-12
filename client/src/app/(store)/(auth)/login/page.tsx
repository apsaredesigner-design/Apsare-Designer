"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { login } = useAuth();
  const toast = useToast();

  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    if (!emailOrMobile.trim()) {
      setFieldErrors((prev) => ({ ...prev, emailOrMobile: "Please enter your email or mobile" }));
      return;
    }
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setIsLoading(true);
    try {
      await login({
        emailOrMobile: emailOrMobile.trim(),
        password,
        remember,
      });
      toast.success("Welcome back to Label Apsáre");
      router.push(redirectUrl);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setGeneralError(err.message || "Invalid email/mobile or password");
        }
      } else {
        const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
        setGeneralError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-sage-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold-600 font-semibold">
            Member Access
          </span>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
            Welcome Back
          </h1>
          <p className="mt-2 text-xs text-ink/65">
            Sign in to track orders, manage addresses and access your saved collection.
          </p>
        </div>

        {generalError && (
          <div className="mt-4 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email or Mobile"
            placeholder="ananya@example.com or 9876543210"
            value={emailOrMobile}
            onChange={(e) => setEmailOrMobile(e.target.value)}
            error={fieldErrors.emailOrMobile || fieldErrors.identifier}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="username"
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="current-password"
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

          <div className="flex items-center justify-between text-xs pt-1">
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              label="Remember me for 30 days"
            />
            <Link
              href="/forgot-password"
              className="font-medium text-gold-600 hover:text-ink transition"
            >
              Forgot password?
            </Link>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-sage-200 pt-6 text-center text-xs text-ink/70">
          <span>New to Label Apsáre? </span>
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
            className="font-semibold text-gold-600 hover:text-ink"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
