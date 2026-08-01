"use client";

import { useEffect, useRef, useState } from "react";
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

  return <QuizRunnerInner key={runId} words={words} backHref={backHref} onReplay={() => setRunId((n) => n + 1)} />;
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
    if (finished || paused) return;
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
  }, [paused, finished]);

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [currentIndex, finished]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
        <span className="text-sm font-semibold tabular-nums">
          SCORE {score}/{total}
        </span>
        <span className="text-sm font-semibold tabular-nums">{formatDuration(secondsLeft)}</span>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => goTo(currentIndex - 1)}
            className="text-muted-foreground hover:text-foreground"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => goTo(currentIndex + 1)}
            className="text-muted-foreground hover:text-foreground"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="text-muted-foreground hover:text-foreground"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setFinished("gaveup")}
            className="text-danger hover:opacity-80"
          >
            Give up
          </button>
        </div>
      </div>

      {paused ? (
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
                className={
                  isCurrent
                    ? "border-l-4 border-l-current-row bg-current-row-surface"
                    : isCorrect
                      ? "border-l-4 border-l-success bg-success-surface"
                      : "border-l-4 border-l-transparent border-t border-border"
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
