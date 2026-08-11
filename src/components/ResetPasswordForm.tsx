"use client";

import { useState } from "react";
import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";
import { PasswordField } from "@/components/PasswordField";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({
  token,
  email,
}: {
  token: string | null;
  email: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? "That reset link is invalid or has expired.");
      return;
    }

    // Real navigation, not router.push() — same reasoning as the login page:
    // ensures the next page load picks up the fresh (logged-out) state.
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-4">
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-4 flex h-14 w-14 -rotate-6 items-center justify-center rounded-md border-2 border-accent text-2xl font-bold text-accent"
        >
          词
        </span>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {email && (
          <p className="mt-1 text-sm text-muted-foreground">
            for <span className="text-foreground">{email}</span>
          </p>
        )}
      </div>

      {!token ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-danger">
            This reset link is missing or invalid. Request a new one.
          </p>
          <Link href="/forgot-password" className="text-sm text-foreground underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
        >
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
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
          <button
            type="submit"
            disabled={submitting}
            className={pillClasses("primary", submitting)}
          >
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </main>
  );
}
