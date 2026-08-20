"use client";

// The plus icon (docs/57-saved-words-plan.md §6) — bookmarks a word into the
// player's Saved Words list. Renders nothing unless the feature is enabled
// (§4) — the whole point is that a new account never sees this until they
// opt in from the /saved-words tab. Placement rule was revised after v1
// shipped (docs/57 §1, docs/58 finding 58-1's fix) — it's now wired into
// in-quiz word rows too, not just pre-start tables, since neither its own
// saved-state nor its toast (chinese only, see SavedWordsProvider) ever
// surfaces a hidden pinyin/meaning.
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
      onClick={(e) => {
        // docs/58-audit-2026-08-20.md finding 58-1 — every in-quiz call site
        // (QuizRunner/ChoiceQuizRunner) nests this inside a word row that's
        // itself a click target (tapping a row jumps the quiz there). Without
        // this, tapping the plus icon on any row bubbled up and jumped the
        // quiz to that word, clearing whatever was typed for the actual
        // current question. Stopping it here covers every call site at once,
        // not just the two that currently need it.
        e.stopPropagation();
        save({ chinese, pinyin, meaning });
      }}
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
