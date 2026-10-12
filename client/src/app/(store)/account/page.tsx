"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { User, Mail, Phone, Lock, Save, KeyRound } from "lucide-react";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  // Profile edit state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    const body: { fullName?: string; email?: string; mobile?: string } = {};
    if (fullName.trim() !== user.fullName) body.fullName = fullName.trim();
    if (email.trim().toLowerCase() !== user.email) body.email = email.trim().toLowerCase();
    if (mobile.trim() !== user.mobile) body.mobile = mobile.trim();

    if (Object.keys(body).length === 0) {
      toast.info("No profile changes detected.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await api<{ user: UserType }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      updateUser(res.user);
    } catch (err: unknown) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setProfileErrors(err.fieldErrors);
      } else {
        const message = err instanceof Error ? err.message : "Failed to update profile.";
        toast.error(message);
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    if (!currentPassword) {
      setPasswordErrors({ currentPassword: "Enter current password" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErrors({ newPassword: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setPasswordErrors(err.fieldErrors);
      } else {
        const message = err instanceof Error ? err.message : "Failed to change password.";
        toast.error(message);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Details Form */}
      <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <div className="border-b border-sage-200 pb-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Personal Information
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Update your contact information for order communication and receipts.
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={profileErrors.fullName}
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={profileErrors.email}
              leftIcon={<Mail className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mobile Number (10 digits)"
              type="tel"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              error={profileErrors.mobile}
              leftIcon={<Phone className="h-4 w-4" />}
            />
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-ink/80 font-medium">
                Member Since
              </label>
              <div className="rounded-md border border-sage-200 bg-sage-50 px-3.5 py-2.5 text-sm text-ink/70">
                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingProfile}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <div className="border-b border-sage-200 pb-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Security & Password
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Ensure your account is protected with a secure password.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={passwordErrors.currentPassword}
            leftIcon={<Lock className="h-4 w-4" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="New Password (min 8 chars)"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordErrors.newPassword}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordErrors.confirmPassword}
              leftIcon={<Lock className="h-4 w-4" />}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="outline"
              size="md"
              isLoading={isUpdatingPassword}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
