"use client";

import { useState } from "react";
import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setSubmitting(false);

    // Show the same "check your email" state whether or not the address is
    // registered — same enumeration-prevention reasoning as the old
    // UNREACHABLE_PASSWORD_HASH decoy this migration replaces (docs/36):
    // a differing response here would let an attacker probe which emails
    // have accounts.
    if (requestError) {
      setError("Something went wrong. Try again.");
      return;
    }
    setSent(true);
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
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email you registered with — we&rsquo;ll send a reset link.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm">
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </p>
          <Link href="/login" className="text-sm text-foreground underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              autoComplete="email"
              className="rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className={pillClasses("primary", submitting)}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-foreground underline">
              Back to log in
            </Link>
          </p>
        </form>
      )}
    </main>
  );
}
