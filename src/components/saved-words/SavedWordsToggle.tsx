"use client";

// docs/57-saved-words-plan.md §4 — v1's version of "opting in": one line of
// text and a single button, not a full onboarding flow (that's §Later).
// Reused for both directions — the off→on explanation screen and the small
// "turn off" control shown inside the tab once it's on.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pillClasses } from "@/components/pill-classes";

export function SavedWordsToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    await fetch("/api/account/saved-words-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    // Real page refresh, not just a local state flip — the plus icon lives
    // in a bunch of other server components (VocabTable etc.) fed by
    // RootLayout's SavedWordsProvider seed, which only re-reads the DB on a
    // real navigation/refresh, same pattern AddFriendForm/FriendRequestRow
    // already use for their own mutations.
    router.refresh();
    setPending(false);
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center shadow-lg shadow-background/50">
        <p className="text-muted-foreground">
          Save tricky words here to drill them later — a plus icon will show up next to every
          word, anywhere you see the speaker icon.
        </p>
        <button type="button" onClick={toggle} disabled={pending} className={pillClasses("primary")}>
          {pending ? "Turning on…" : "Turn on Saved Words"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={pillClasses("secondary", pending, "sm")}
    >
      {pending ? "Turning off…" : "Turn off Saved Words"}
    </button>
  );
}
