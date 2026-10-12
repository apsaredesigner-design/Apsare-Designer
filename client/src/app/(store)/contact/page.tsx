"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters";
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!subject.trim() || subject.trim().length < 2) {
      errs.subject = "Please enter a subject";
    }
    if (!message.trim() || message.trim().length < 10) {
      errs.message = "Message must be at least 10 characters";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      await api("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      setIsSuccess(true);
      toast.success("Thank you for reaching out. We will respond shortly!");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        const message = err instanceof Error ? err.message : "Failed to send message. Please try again.";
        setGeneralError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-[10px] uppercase tracking-[0.35em] text-gold-600 font-semibold">
          Customer Concierge
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-ink sm:text-5xl">
          We Are Here for You
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-ink/70 leading-relaxed">
          Whether you need bespoke saree styling recommendations, blouse sizing
          assistance, or order queries, our concierge is at your service.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact info cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs space-y-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Studio & Customer Care
            </h2>

            <div className="flex items-start gap-3.5 text-xs text-ink/80">
              <Mail className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink font-semibold">Email Enquiries</strong>
                <a
                  href="mailto:support@apsaredesigner.in"
                  className="text-gold-700 hover:underline"
                >
                  support@apsaredesigner.in
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3.5 text-xs text-ink/80">
              <Phone className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink font-semibold">Phone & WhatsApp</strong>
                <a href="tel:+917760016378" className="hover:underline">
                  +91 77600 16378
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3.5 text-xs text-ink/80">
              <MapPin className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink font-semibold">Design Studio</strong>
                <p className="leading-relaxed mt-0.5 text-ink/70">
                  Bangalore, 560091
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-sage-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-semibold text-ink mb-2">
              Send us a Message
            </h2>
            <p className="text-xs text-ink/65 mb-6">
              Fill in your details below and our team will get back to you within 24 hours.
            </p>

            {isSuccess && (
              <div className="mb-6 rounded-lg bg-sage-100 border border-sage-300 p-4 text-xs text-sage-800 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-sage-600 shrink-0" />
                <span>
                  Thank you for writing to us. Your message has been received and our
                  concierge team will get back to you shortly.
                </span>
              </div>
            )}

            {generalError && (
              <div className="mb-6 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Name"
                  placeholder="Ananya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="ananya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldErrors.email}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone / Mobile (Optional)"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={fieldErrors.phone}
                />
                <Input
                  label="Subject"
                  placeholder="Order Inquiry / Saree Recommendation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  error={fieldErrors.subject}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block uppercase tracking-wider text-ink/80 font-medium">
                  Your Message
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe how we can assist you…"
                  className={`w-full rounded-md border p-3 text-xs text-ink outline-none transition ${
                    fieldErrors.message
                      ? "border-sale focus:border-sale"
                      : "border-sage-300 focus:border-gold-500"
                  }`}
                  required
                />
                {fieldErrors.message && (
                  <p className="mt-1 text-xs text-sale">{fieldErrors.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Dispatch Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
