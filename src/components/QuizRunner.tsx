"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Pause, Play } from "lucide-react";
import { matchesPinyin } from "@/quiz/pinyin-match";
import { formatDuration } from "@/quiz/format-time";
import { pillClasses } from "@/components/pill-classes";

export type QuizWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
};

const QUIZ_DURATION_SECONDS = 600;

export function QuizRunner({ words, backHref }: { words: QuizWord[]; backHref: string }) {
  const [runId, setRunId] = useState(0);

  return (
    <QuizRunnerInner
      key={runId}
      words={words}
      backHref={backHref}
      onReplay={() => setRunId((n) => n + 1)}
    />
  );
}

function QuizRunnerInner({
  words,
  backHref,
  onReplay,
}: {
  words: QuizWord[];
  backHref: string;
  onReplay: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [correctIds, setCorrectIds] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_DURATION_SECONDS);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState<"completed" | "timeup" | "gaveup" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = words[currentIndex];
  const score = correctIds.size;
  const total = words.length;

  useEffect(() => {
    if (!started || finished || paused) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setFinished("timeup");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, paused, finished]);

  useEffect(() => {
    if (started && !finished && !paused) inputRef.current?.focus();
  }, [currentIndex, started, finished, paused]);

  function goTo(index: number) {
    const next = ((index % total) + total) % total;
    setCurrentIndex(next);
    setInput("");
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (currentWord && matchesPinyin(value, currentWord.pinyin)) {
      setCorrectIds((prev) => {
        const next = new Set(prev).add(currentWord.id);
        if (next.size === total) setFinished("completed");
        return next;
      });
      setInput("");
      const nextUnanswered = words.findIndex(
        (w, i) => i !== currentIndex && !correctIds.has(w.id)
      );
      if (nextUnanswered !== -1) goTo(nextUnanswered);
    }
  }

  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const heading =
      finished === "timeup" ? "Time's up!" : finished === "gaveup" ? "Quiz ended" : "Quiz complete!";

    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface p-10 text-center">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <p className="text-5xl font-bold tabular-nums text-accent">{percent}%</p>
        <p className="text-muted-foreground">
          {score} / {total} correct
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onReplay} className={pillClasses("primary")}>
            Replay
          </button>
          <a href={backHref} className={pillClasses("secondary")}>
            Back
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-18.25 z-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4 shadow-lg shadow-background/50">
        <span className="text-sm font-semibold tabular-nums">
          SCORE {score}/{total}
        </span>
        <span className="text-sm font-semibold tabular-nums">{formatDuration(secondsLeft)}</span>
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => goTo(currentIndex - 1)} disabled={!started} label="Prev">
            <ChevronLeft size={16} />
            Prev
          </ToolbarButton>
          <ToolbarButton onClick={() => goTo(currentIndex + 1)} disabled={!started} label="Next">
            Next
            <ChevronRight size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setPaused((p) => !p)} disabled={!started} label="Pause">
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? "Resume" : "Pause"}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setFinished("gaveup")}
            disabled={!started}
            label="Give up"
            variant="danger"
          >
            <Flag size={16} />
            Give up
          </ToolbarButton>
        </div>
      </div>

      {!started ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-muted-foreground">
            {total} words · {formatDuration(QUIZ_DURATION_SECONDS)} on the clock
          </p>
          <button type="button" onClick={() => setStarted(true)} className={pillClasses("primary")}>
            Start quiz
          </button>
        </div>
      ) : paused ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground">
          Paused
        </div>
      ) : (
        currentWord && (
          <div className="rounded-xl border border-border bg-surface p-8">
            <p className="text-4xl font-bold">{currentWord.chinese}:</p>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus
              placeholder="type the pinyin"
              className="mt-4 w-full rounded border border-border bg-transparent px-3 py-2 outline-none focus:border-border-strong"
            />
          </div>
        )
      )}

      <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
        <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Chinese</th>
            <th className="px-3 py-2">Pinyin</th>
            <th className="px-3 py-2">English</th>
          </tr>
        </thead>
        <tbody>
          {words.map((word, index) => {
            const isCorrect = correctIds.has(word.id);
            const isCurrent = index === currentIndex;
            return (
              <tr
                key={word.id}
                onClick={() => started && goTo(index)}
                className={
                  (started ? "cursor-pointer " : "") +
                  (isCurrent
                    ? "border-l-4 border-l-current-row bg-current-row-surface"
                    : isCorrect
                      ? "border-l-4 border-l-success bg-success-surface hover:bg-surface-raised"
                      : "border-l-4 border-l-transparent border-t border-border hover:bg-surface-raised")
                }
              >
                <td className="px-3 py-2 font-medium">{word.chinese}</td>
                <td className="px-3 py-2 text-muted-foreground">{isCorrect ? word.pinyin : "—"}</td>
                <td className="px-3 py-2">{word.meaning ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  label,
  variant = "default",
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "danger"
          ? "text-danger hover:bg-danger/10"
          : "text-foreground hover:bg-surface-raised"
      }`}
    >
      {children}
    </button>
  );
}
