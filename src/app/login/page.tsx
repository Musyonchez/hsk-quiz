"use client";

import { useState } from "react";
import Link from "next/link";
import { pillClasses } from "@/components/pill-classes";
import { PasswordField } from "@/components/PasswordField";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Login failed.");
      return;
    }

    // A full navigation, not router.push(): the header's dashboard link can
    // get prefetched while still logged out, which bakes in a
    // redirect-to-/login response from that state. A client-side push after
    // login can replay that stale cached redirect. A real navigation always
    // hits the server fresh with the new session cookie.
    window.location.href = "/dashboard";
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
          Type the pinyin for HSK 1 and HSK 2 vocabulary, by chapter or the
          full level.
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
            className="rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
          />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} />
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
