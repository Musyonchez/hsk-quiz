"use client";

import { useState } from "react";
import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";
import { PasswordField } from "@/components/auth/PasswordField";
import { authClient } from "@/lib/auth/auth-client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    // `name` defaults to `username` — this app has no separate display-name
    // field on registration, same as before this migration.
    const { error: signUpError } = await authClient.signUp.email({
      username,
      email,
      password,
      name: username,
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Registration failed.");
      return;
    }

    // Real navigation, not router.push() — see the same note on the login
    // page: a client-side push can replay a stale cached redirect. "/"
    // itself is the post-login landing page — see page.tsx's LoggedInHome.
    window.location.href = "/";
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
        <h1 className="text-2xl font-bold">HSK Quiz</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Type the pinyin for HSK vocabulary, by chapter or the full level.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            autoComplete="username"
            className="rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
          />
          <span className="text-xs text-muted-foreground">Only used for password resets.</span>
        </label>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          minLength={8}
          hint="At least 8 characters."
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
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
          {submitting ? "Creating account…" : "Register"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
