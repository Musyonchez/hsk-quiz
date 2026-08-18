"use client";

// docs/57-saved-words-plan.md §8 — v1's flat list + quiz-mode integration.
// No new quiz runner: QuizModeGate already does "drill words from selection
// X" generically once handed a QuizWord[], same as the cross-level custom
// quiz page (src/app/custom-quiz/quiz/page.tsx) uses it.
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { QuizWord } from "@/quiz/types";
import { QuizModeGate } from "@/components/quiz/QuizModeGate";

export type SavedWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
  mnemonic: string | null;
};

export function SavedWordsPanel({ words }: { words: SavedWord[] }) {
  const [list, setList] = useState(words);
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Remounts QuizModeGate whenever a word's removed mid-review — its
  // internal mode/progress state would otherwise go stale against a word
  // list that's shrunk out from under it (same reasoning docs/32 §2 gives
  // for keying it on the mode itself).
  const [quizKey, setQuizKey] = useState(0);

  async function remove(id: number) {
    setRemovingId(id);
    const res = await fetch(`/api/saved-words/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((w) => w.id !== id));
      setQuizKey((k) => k + 1);
    }
    setRemovingId(null);
  }

  if (list.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground">
        No saved words yet — tap the + icon next to any word to add it here.
      </p>
    );
  }

  const quizWords: QuizWord[] = list.map((w) => ({
    id: w.id,
    chinese: w.chinese,
    pinyin: w.pinyin,
    meaning: w.meaning,
    mnemonic: w.mnemonic,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-lg text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Chinese</th>
              <th className="px-3 py-2">Pinyin</th>
              <th className="px-3 py-2">English</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((word) => (
              <tr key={word.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{word.chinese}</td>
                <td className="px-3 py-2 text-muted-foreground">{word.pinyin}</td>
                <td className="px-3 py-2">{word.meaning ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(word.id)}
                    disabled={removingId === word.id}
                    aria-label={`Remove ${word.chinese}`}
                    className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Drill these words</h2>
        {/* Not tracked on the leaderboard (docs/57's Open Questions #1) — a
            personal, freely-edited word list doesn't rank the same way a
            fixed chapter does. */}
        <QuizModeGate
          key={quizKey}
          words={quizWords}
          backHref="/saved-words"
          trackAttempt={false}
          meaningVariant="choice"
          characterMode
        />
      </div>
    </div>
  );
}
