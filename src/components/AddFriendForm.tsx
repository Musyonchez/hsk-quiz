"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pillClasses } from "./pill-classes";

export function AddFriendForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // docs/44-audit-quiz-ux-gaps.md: this fetch used to be unguarded — a
    // network failure (not just a non-OK response) threw here, skipped
    // setSubmitting(false) below, and left the button stuck on "Sending…"
    // forever with no error shown. Same try/catch FriendRequestRow.tsx
    // already uses for exactly this scenario.
    let res: Response;
    try {
      res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } catch {
      setSubmitting(false);
      setError("Couldn't reach the server — try again.");
      return;
    }

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't send that request.");
      return;
    }

    setUsername("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="flex-1 rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
        />
        <button type="submit" disabled={submitting} className={pillClasses("primary", submitting)}>
          {submitting ? "Sending…" : "Send request"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
