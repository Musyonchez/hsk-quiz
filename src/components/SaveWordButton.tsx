"use client";

// The plus icon (docs/57-saved-words-plan.md §6) — bookmarks a word into the
// player's Saved Words list. Renders nothing unless the feature is enabled
// (§4) — the whole point is that a new account never sees this until they
// opt in from the /saved-words tab. Only wire this in where §1 says it's
// safe: pre-quiz/no-hidden-answer contexts, never next to an in-quiz answer
// display a Hard-mode toggle might be hiding.
import { Check, Plus } from "lucide-react";
import { useSavedWords } from "@/lib/saved-words/context";

export function SaveWordButton({
  chinese,
  pinyin,
  meaning,
  className = "",
}: {
  chinese: string;
  pinyin: string;
  meaning: string | null;
  className?: string;
}) {
  const { enabled, isSaved, save } = useSavedWords();
  if (!enabled) return null;

  const saved = isSaved(chinese);

  return (
    <button
      type="button"
      onClick={() => save({ chinese, pinyin, meaning })}
      aria-label={saved ? `${chinese} already saved` : `Save ${chinese}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 transition-colors ${
        saved
          ? "text-accent"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      } ${className}`}
    >
      {saved ? <Check size={16} /> : <Plus size={16} />}
    </button>
  );
}
