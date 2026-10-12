"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process request";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-sage-200 bg-white p-6 sm:p-8 shadow-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>

        {isSubmitted ? (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-sage-600 mb-3" />
            <h2 className="font-display text-2xl font-semibold text-ink">
              Check Your Inbox
            </h2>
            <p className="mt-2 text-xs text-ink/70 leading-relaxed">
              We have dispatched a secure password reset link to <strong>{email}</strong>. 
              The link expires in 30 minutes.
            </p>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="outline" size="md">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
                Reset Password
              </h1>
              <p className="mt-2 text-xs text-ink/65">
                Enter your registered email address to receive password reset
                instructions.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Registered Email"
                type="email"
                placeholder="ananya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                leftIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Send Reset Link
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
