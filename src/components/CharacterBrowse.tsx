"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Shuffle, X } from "lucide-react";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { SpeakerButton } from "@/components/SpeakerButton";

export type { QuizWord };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Character island, part 1 (docs/38) — the word-dump view Character mode
// opens on, replacing CharacterStudy's sequential tap-to-flip flashcard.
// A browsable grid (character + pinyin only, no English in the box — that
// and the mnemonic live only in the popup) with a Prev/Next/arrow-key/swipe
// lightbox on click. Not a quiz: no score, no tracking, same "practice
// only" framing CharacterStudy had. `onStartQuiz` hands control back to the
// Character island's quiz half (docs/38 part 2) once the player's ready.
export function CharacterBrowse({
  words,
  onStartQuiz,
}: {
  words: QuizWord[];
  onStartQuiz: () => void;
}) {
  const [order, setOrder] = useState(words);
  const [showPinyin, setShowPinyin] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  // docs/42-audit-frontend-components.md §5: this popup had no focus
  // management at all — a keyboard/screen-reader user stayed focused on the
  // grid tile behind it (defeating aria-modal) and never got focus back on
  // close. `triggerRef` remembers which grid tile opened the popup so close()
  // can return focus there; `closeButtonRef` is what receives focus on open.
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const openWord = openIndex !== null ? order[openIndex] : null;

  function close() {
    setOpenIndex(null);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (openIndex !== null) closeButtonRef.current?.focus();
  }, [openIndex]);

  function step(delta: 1 | -1) {
    setOpenIndex((current) => {
      if (current === null || order.length === 0) return current;
      return ((current + delta) % order.length + order.length) % order.length;
    });
  }

  // Left/right arrow keys move between words without closing the popup;
  // Escape closes it — only wired up while the popup is actually open.
  useEffect(() => {
    if (openIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step/close are stable closures over `order`, not props/state that change shape
  }, [openIndex, order.length]);

  if (words.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground">
        No characters here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => setShowPinyin((v) => !v)} label="Toggle pinyin">
            {showPinyin ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPinyin ? "Hide pinyin" : "Show pinyin"}
          </ToolbarButton>
          <ToolbarButton onClick={() => setOrder((prev) => shuffle(prev))} label="Shuffle">
            <Shuffle size={16} />
            Shuffle
          </ToolbarButton>
        </div>
        <button type="button" onClick={onStartQuiz} className={pillClasses("primary")}>
          Start quiz
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {order.map((word, index) => (
          <button
            key={word.id}
            type="button"
            onClick={(e) => {
              triggerRef.current = e.currentTarget;
              setOpenIndex(index);
            }}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-4 text-center transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <span className="text-3xl font-bold">{word.chinese}</span>
            {showPinyin && <span className="text-sm text-muted-foreground">{word.pinyin}</span>}
          </button>
        ))}
      </div>

      {openWord && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-20 flex items-center justify-center bg-background/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              // A short tap shouldn't count as a swipe — 40px is comfortably
              // past accidental finger jitter.
              if (Math.abs(delta) < 40) return;
              step(delta > 0 ? -1 : 1);
            }}
            className="relative flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-border bg-surface p-8 text-center shadow-lg shadow-background/50"
          >
            <SpeakerButton
              text={openWord.chinese}
              kind="word"
              className="absolute left-3 top-3"
            />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            >
              <X size={18} />
            </button>

            <span className="relative flex h-36 w-36 items-center justify-center">
              <span aria-hidden className="absolute inset-0 rounded border border-border">
                <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </span>
              <span className="relative text-7xl font-bold">{openWord.chinese}</span>
            </span>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-semibold text-accent">{openWord.pinyin}</span>
              <span className="text-sm text-muted-foreground">{openWord.meaning ?? "—"}</span>
              {openWord.mnemonic && (
                <p className="mt-2 rounded-lg bg-surface-raised px-4 py-3 text-sm text-foreground">
                  {openWord.mnemonic}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ToolbarButton onClick={() => step(-1)} label="Prev">
                <ChevronLeft size={16} />
                Prev
              </ToolbarButton>
              <ToolbarButton onClick={() => step(1)} label="Next">
                Next
                <ChevronRight size={16} />
              </ToolbarButton>
            </div>
          </div>
        </div>
      )}
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
