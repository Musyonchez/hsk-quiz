"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";

export type { QuizWord };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Flashcard "Study" mode for Character mode (docs/33-character-quiz-single-
// card-redesign-plan.md) — not a quiz, no score/timer/tracking, same
// "practice only" treatment Custom Quiz already gets. Flip a card to reveal
// pinyin+meaning, Prev/Shuffle/Next through the deck. Deliberately not a
// remounted-via-key runner like the graded modes (no Replay/Drill missed to
// support here) — a fresh page visit is already a fresh shuffle.
export function CharacterStudy({ words }: { words: QuizWord[] }) {
  // Starts in server-stable `words` order, not pre-shuffled: shuffling with
  // Math.random() inside the initializer would run during SSR too, and the
  // server's random order would almost never match the client's on
  // hydration — a real hydration-mismatch bug caught live (React discards
  // and re-renders the whole tree when this happens). Shuffled once here,
  // client-only, right after mount instead.
  const [queue, setQueue] = useState(words);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only randomization that can't run during SSR, not state mirroring render-available data
    setQueue(shuffle(words));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever re-shuffle on mount, not every time the `words` reference changes
  }, []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (queue.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground">
        No characters to study here.
      </p>
    );
  }

  const item = queue[index];

  function goTo(next: number) {
    setIndex(((next % queue.length) + queue.length) % queue.length);
    setFlipped(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="w-full">
        <div className="h-1 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent-secondary transition-[width]"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs tabular-nums text-muted-foreground">
          {index + 1} / {queue.length}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Hide answer" : "Reveal answer"}
        className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center shadow-lg shadow-background/50"
      >
        <span className="relative flex h-36 w-36 items-center justify-center">
          {/* A light tian-zi-gé grid behind the character — the crossed
              guide lines a Chinese character is traditionally practiced
              against, orienting its proportions rather than pure
              decoration. */}
          <span aria-hidden className="absolute inset-0 rounded border border-border">
            <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </span>
          <span className="relative text-7xl font-bold">{item.chinese}</span>
        </span>

        <div className="flex min-h-24 flex-col items-center gap-1">
          {flipped ? (
            <>
              <span className="text-xl font-semibold text-accent">{item.pinyin}</span>
              <span className="text-sm text-muted-foreground">{item.meaning ?? "—"}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">tap to reveal</span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-3">
        <ToolbarButton onClick={() => goTo(index - 1)} label="Prev">
          <ChevronLeft size={16} />
          Prev
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setQueue(shuffle(words));
            goTo(0);
          }}
          label="Shuffle"
        >
          <Shuffle size={16} />
          Shuffle
        </ToolbarButton>
        <ToolbarButton onClick={() => goTo(index + 1)} label="Next">
          Next
          <ChevronRight size={16} />
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={pillClasses("secondary", false, "sm") + " flex items-center gap-1.5"}
    >
      {children}
    </button>
  );
}
