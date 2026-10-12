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
import { Eye, EyeOff, Lock, Mail, Phone, User as UserIcon } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { signup } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
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

    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      errors.mobile = "Enter a valid 10-digit Indian mobile number";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password,
        remember,
      });
      toast.success("Account created successfully! Welcome to Label Apsáre.");
      router.push(redirectUrl);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setGeneralError(err.message || "Failed to create account. Email or mobile may already be registered.");
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
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-sage-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold-600 font-semibold">
            Join Label Apsáre
          </span>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
            Create Account
          </h1>
          <p className="mt-2 text-xs text-ink/65">
            Save your addresses, track your orders and check out faster.
          </p>
        </div>

        {generalError && (
          <div className="mt-4 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Full Name"
            placeholder="Ananya Rao"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.fullName}
            leftIcon={<UserIcon className="h-4 w-4" />}
            autoComplete="name"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="ananya@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />

          <Input
            label="Mobile Number (10 digits)"
            type="tel"
            maxLength={10}
            placeholder="9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            error={fieldErrors.mobile}
            leftIcon={<Phone className="h-4 w-4" />}
            autoComplete="tel"
          />

          <div className="relative">
            <Input
              label="Password (min 8 chars, 1 letter & 1 number)"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
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

          <div className="pt-1">
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              label="Keep me signed in on this device"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-sage-200 pt-6 text-center text-xs text-ink/70">
          <span>Already have an account? </span>
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
            className="font-semibold text-gold-600 hover:text-ink"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
