"use client";

import { useState } from "react";
import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";
import { PasswordField } from "@/components/auth/PasswordField";
import { authClient } from "@/lib/auth/auth-client";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Same single field accepts either — a bare "@" is a decent enough
    // signal, since "@" isn't in USERNAME_PATTERN (src/lib/auth.ts) so a
    // real username could never contain one.
    const { error: signInError } = identifier.includes("@")
      ? await authClient.signIn.email({ email: identifier, password })
      : await authClient.signIn.username({ username: identifier, password });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? "Login failed.");
      return;
    }

    // A full navigation, not router.push(): a level link in the header can
    // get prefetched while still logged out, which bakes in a
    // redirect-to-/login response from that state. A client-side push after
    // login can replay that stale cached redirect. A real navigation always
    // hits the server fresh with the new session cookie. "/" itself is the
    // post-login landing page — see page.tsx's LoggedInHome.
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
          <span className="text-sm">Username or email</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
            required
            autoComplete="username"
            className="rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-focus-ring"
          />
        </label>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Link
          href="/forgot-password"
          className="-mt-2 self-end text-xs text-muted-foreground underline"
        >
          Forgot password?
        </Link>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className={pillClasses("primary", submitting)}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-foreground underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
