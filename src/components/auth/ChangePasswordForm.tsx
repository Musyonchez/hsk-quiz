"use client";

import { useState } from "react";
import { pillClasses } from "@/components/pill-classes";
import { PasswordField } from "@/components/auth/PasswordField";
import { authClient } from "@/lib/auth/auth-client";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);

    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      // Same reasoning as the forgot-password flow (docs/37) — a password
      // change is exactly the moment a device you don't control might hold
      // a live session.
      revokeOtherSessions: true,
    });

    setSubmitting(false);

    if (changeError) {
      setError(changeError.message ?? "Couldn't change your password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
    >
      <h2 className="text-sm font-medium">Change password</h2>
      <PasswordField
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        minLength={8}
        hint="At least 8 characters."
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && (
        <p className="text-sm text-accent-secondary">
          Password changed. Other devices have been signed out.
        </p>
      )}
      <button type="submit" disabled={submitting} className={pillClasses("primary", submitting)}>
        {submitting ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
