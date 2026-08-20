"use client";

// docs/57-saved-words-plan.md §4 — v1's version of "opting in": one line of
// text and a single button, not a full onboarding flow (that's §Later).
// Reused for both directions — the off→on explanation screen and the small
// "turn off" control shown inside the tab once it's on.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pillClasses } from "@/components/pill-classes";
import { useSavedWords } from "@/lib/saved-words/context";

export function SavedWordsToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { setEnabled } = useSavedWords();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch("/api/account/saved-words-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) {
      const data: { enabled: boolean } = await res.json();
      // docs/58-audit-2026-08-20.md finding 58-2 — push the confirmed value
      // straight into SavedWordsContext. `router.refresh()` below is still
      // needed too (this page's own server-rendered content — whether it
      // shows this off-screen or the word list — depends on the same flag
      // read server-side in saved-words/page.tsx), but a refresh alone
      // never reaches SavedWordsProvider's already-mounted client state
      // (see the context's own comment on `setEnabled` for why), so every
      // other SaveWordButton on the site stayed stuck on the old value
      // without this.
      setEnabled(data.enabled);
    }
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
