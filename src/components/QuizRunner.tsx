"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flag,
  Pause,
  Play,
  Shuffle,
} from "lucide-react";
import { matchesPinyin } from "@/quiz/pinyin-match";
import { formatDuration } from "@/quiz/format-time";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizLinkCard } from "@/components/QuizLinkCard";
import { VocabTableGroup } from "@/components/VocabTable";

export type { QuizWord };

// Client-side average since GET /api/leaderboard returns every ranked row
// unpaginated — no separate aggregate endpoint needed at this app's scale
// (see docs/06-quiz-mechanics.md).
function averagePercent(
  rows: { score: number; total: number }[],
): number | null {
  if (rows.length === 0) return null;
  const percents = rows.map((row) =>
    row.total > 0 ? (row.score / row.total) * 100 : 0,
  );
  return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizRunner({
  words,
  backHref,
  quizKey,
  trackAttempt = true,
  allowDrillMissed = false,
  nextQuiz = null,
  anotherQuiz,
  durationSeconds,
}: {
  words: QuizWord[];
  backHref: string;
  quizKey?: string;
  trackAttempt?: boolean;
  allowDrillMissed?: boolean;
  nextQuiz?: QuizNavTarget | null;
  anotherQuiz?: QuizNavTarget;
  durationSeconds?: number;
}) {
  const [runId, setRunId] = useState(0);
  const [activeWords, setActiveWords] = useState(words);
  const [activeTrackAttempt, setActiveTrackAttempt] = useState(trackAttempt);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(durationSeconds);

  function handleDrillMissed(missed: QuizWord[]) {
    setActiveWords(missed);
    setActiveTrackAttempt(false);
    setActiveDurationSeconds(undefined);
    setRunId((n) => n + 1);
  }

  return (
    <QuizRunnerInner
      key={runId}
      words={activeWords}
      backHref={backHref}
      quizKey={quizKey}
      trackAttempt={activeTrackAttempt}
      allowDrillMissed={allowDrillMissed}
      nextQuiz={nextQuiz}
      anotherQuiz={anotherQuiz}
      durationSeconds={activeDurationSeconds}
      onReplay={() => setRunId((n) => n + 1)}
      onDrillMissed={handleDrillMissed}
    />
  );
}

function QuizRunnerInner({
  words,
  backHref,
  quizKey,
  trackAttempt,
  allowDrillMissed,
  nextQuiz,
  anotherQuiz,
  durationSeconds,
  onReplay,
  onDrillMissed,
}: {
  words: QuizWord[];
  backHref: string;
  quizKey?: string;
  trackAttempt: boolean;
  allowDrillMissed: boolean;
  nextQuiz: QuizNavTarget | null;
  anotherQuiz?: QuizNavTarget;
  durationSeconds?: number;
  onReplay: () => void;
  onDrillMissed: (missed: QuizWord[]) => void;
}) {
  const timed = durationSeconds !== undefined;
  const [order, setOrder] = useState(words);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [correctIds, setCorrectIds] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  // Only the two user-triggered end states are stored — "timeup" is derived
  // below from secondsLeft during render instead, since React's guidance is
  // to compute derivable state at render time rather than mirror it into
  // state via an effect (which causes an extra render and, if you're not
  // careful with the dependency array, a setState-in-effect lint error).
  const [finishedState, setFinishedState] = useState<
    "completed" | "gaveup" | null
  >(null);
  const finished =
    finishedState ?? (timed && started && secondsLeft === 0 ? "timeup" : null);
  const [bestPercent, setBestPercent] = useState<number | null>(null);
  const [avgGlobalPercent, setAvgGlobalPercent] = useState<number | null>(null);
  const [avgFriendPercent, setAvgFriendPercent] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const statsDefaultSetRef = useRef(false);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const currentWord = order[currentIndex];
  const score = correctIds.size;
  const total = order.length;

  // Record the finished attempt exactly once per run (submittedRef survives
  // re-renders but not a Replay, since QuizRunner remounts this component
  // with a fresh key). Fire-and-forget: a failed write shouldn't surface as
  // a failed quiz to the player.
  useEffect(() => {
    if (!finished || submittedRef.current || !trackAttempt || !quizKey) return;
    submittedRef.current = true;
    const elapsedSeconds = (durationSeconds ?? 0) - secondsLeft;
    const encodedKey = encodeURIComponent(quizKey);

    fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizKey, score, total, durationSeconds: elapsedSeconds }),
    })
      .then(() =>
        Promise.all([
          fetch(`/api/attempts/best?quizKey=${encodedKey}`).then((res) =>
            res.ok ? res.json() : null,
          ),
          fetch(`/api/leaderboard?quizKey=${encodedKey}&scope=global`).then(
            (res) => (res.ok ? res.json() : []),
          ),
          fetch(`/api/leaderboard?quizKey=${encodedKey}&scope=friends`).then(
            (res) => (res.ok ? res.json() : []),
          ),
        ]),
      )
      .then(
        ([best, globalRows, friendRows]: [
          { score: number; total: number } | null,
          { score: number; total: number }[],
          { score: number; total: number }[],
        ]) => {
          if (best && best.total > 0)
            setBestPercent(Math.round((best.score / best.total) * 100));
          setAvgGlobalPercent(averagePercent(globalRows));
          setAvgFriendPercent(averagePercent(friendRows));
        },
      )
      .catch((err) => console.error("Failed to record quiz attempt", err));
  }, [finished, trackAttempt, quizKey, score, total, secondsLeft, durationSeconds]);

  // Default Stats to open if anything was missed, closed on a perfect run —
  // set once when the quiz finishes, not re-derived on every render, so a
  // manual toggle afterward (via the Stats/Hide stats button) sticks.
  useEffect(() => {
    if (!finished || statsDefaultSetRef.current) return;
    statsDefaultSetRef.current = true;
    setShowStats(score < total);
  }, [finished, score, total]);

  useEffect(() => {
    if (!timed || !started || finished || paused) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timed, started, paused, finished]);

  useEffect(() => {
    if (started && !finished && !paused) inputRef.current?.focus();
  }, [currentIndex, started, finished, paused]);

  // Center the current row in the space actually visible below the sticky
  // score/timer/input bar — not the full viewport (scrollIntoView's
  // block:"center" would tuck the row half-behind that sticky bar instead).
  // Covers every way currentIndex changes: auto-advance on a correct
  // answer, Prev/Next, and clicking a row directly (all funnel through
  // goTo).
  useEffect(() => {
    if (!started || finished) return;
    const container = containerRef.current;
    const sticky = stickyRef.current;
    if (!container || !sticky) return;
    const row = container.querySelector<HTMLElement>(`[data-row-index="${currentIndex}"]`);
    if (!row) return;

    const stickyBottom = sticky.getBoundingClientRect().bottom;
    const remainingSpace = window.innerHeight - stickyBottom;
    const rowRect = row.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2;
    const targetCenter = stickyBottom + remainingSpace / 2;
    window.scrollBy({ top: rowCenter - targetCenter, behavior: "smooth" });
  }, [currentIndex, started, finished]);

  function goTo(index: number) {
    const next = ((index % total) + total) % total;
    setCurrentIndex(next);
    setInput("");
  }

  // Walks from `from` in `step` direction (1 = forward, -1 = backward),
  // wrapping around, skipping any already-correct word — there's no reason
  // to land Next/Prev on one you've already answered. Falls back to `from`
  // itself if every other word is already done (finishing the quiz makes
  // that moot in practice). Shared by the auto-advance-on-correct-answer
  // path and the Prev/Next toolbar buttons so both skip the same way.
  function nextIncompleteIndex(from: number, step: 1 | -1, ids: Set<number>): number {
    for (let i = 1; i <= total; i++) {
      const index = (((from + step * i) % total) + total) % total;
      if (!ids.has(order[index].id)) return index;
    }
    return from;
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (!currentWord || !matchesPinyin(value, currentWord.pinyin)) return;

    const updatedCorrectIds = new Set(correctIds).add(currentWord.id);
    setCorrectIds(updatedCorrectIds);
    setInput("");

    if (updatedCorrectIds.size === total) {
      setFinishedState("completed");
      return;
    }

    goTo(nextIncompleteIndex(currentIndex, 1, updatedCorrectIds));
  }

  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const heading =
      finished === "timeup"
        ? "Time's up!"
        : finished === "gaveup"
          ? "Quiz ended"
          : "Quiz complete!";
    // The stats breakdown is derived from correctIds, the same state already
    // submitted via POST /api/attempts — no extra API call needed, per
    // docs/09-pages.md §6.
    const missedWords = order.filter((word) => !correctIds.has(word.id));

    return (
      <div className="flex flex-col gap-6">
        {(nextQuiz || anotherQuiz) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {nextQuiz && (
              <QuizLinkCard
                href={nextQuiz.href}
                eyebrow={nextQuiz.eyebrow}
                title={nextQuiz.title}
                icon={ArrowRight}
              />
            )}
            {anotherQuiz && (
              <QuizLinkCard
                href={anotherQuiz.href}
                eyebrow={anotherQuiz.eyebrow}
                title={anotherQuiz.title}
                icon={Shuffle}
              />
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface p-6 text-center">
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-lg font-bold">{heading}</h2>
            <p className="text-4xl font-bold tabular-nums text-accent">
              {percent}%
            </p>
            <p className="text-sm text-muted-foreground">
              {score} / {total} correct
              {bestPercent !== null && <> · your best: {bestPercent}%</>}
            </p>
            {(avgGlobalPercent !== null || avgFriendPercent !== null) && (
              <p className="text-sm text-muted-foreground">
                {avgGlobalPercent !== null && (
                  <>avg score: {avgGlobalPercent}% </>
                )}
                {avgFriendPercent !== null && (
                  <>· avg friend score: {avgFriendPercent}%</>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onReplay}
              className={pillClasses("primary")}
            >
              Replay
            </button>
            {allowDrillMissed && missedWords.length > 0 && (
              <button
                type="button"
                onClick={() => onDrillMissed(missedWords)}
                className={pillClasses("secondary")}
              >
                Drill missed words
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowStats((v) => !v)}
              className={pillClasses("secondary")}
            >
              {showStats ? "Hide stats" : "Stats"}
            </button>
            <a href={backHref} className={pillClasses("secondary")}>
              Back
            </a>
          </div>
          {trackAttempt && quizKey && (
            <a
              href={`/leaderboard/${encodeURIComponent(quizKey)}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              View leaderboard
            </a>
          )}

          {showStats && (
            <div className="w-full text-left">
              <h3 className="mb-2 text-sm font-semibold text-danger">
                Missed ({missedWords.length})
              </h3>
              {missedWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None — you got every word.
                </p>
              ) : (
                <VocabTableGroup words={missedWords} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" ref={containerRef}>
      <div className="sticky top-[var(--header-height)] z-5 flex flex-col gap-4 bg-background pb-4" ref={stickyRef}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <span className="text-sm font-semibold tabular-nums">
            SCORE {score}/{total}
          </span>
          {timed && (
            <span className="text-sm font-semibold tabular-nums">
              {formatDuration(secondsLeft)}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              onClick={() => goTo(nextIncompleteIndex(currentIndex, -1, correctIds))}
              disabled={!started}
              label="Prev"
            >
              <ChevronLeft size={16} />
              Prev
            </ToolbarButton>
            {timed && (
              <ToolbarButton
                onClick={() => setPaused((p) => !p)}
                disabled={!started}
                label="Pause"
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? "Resume" : "Pause"}
              </ToolbarButton>
            )}
            <ToolbarButton
              onClick={() => goTo(nextIncompleteIndex(currentIndex, 1, correctIds))}
              disabled={!started}
              label="Next"
            >
              Next
              <ChevronRight size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setFinishedState("gaveup")}
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
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center shadow-lg shadow-background/50">
            <p className="text-muted-foreground">
              {total} words
              {timed && <> · {formatDuration(durationSeconds ?? 0)} on the clock</>}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStarted(true)}
                className={pillClasses("primary")}
              >
                Start quiz
              </button>
              <ToolbarButton
                onClick={() => setOrder((prev) => shuffle(prev))}
                disabled={false}
                label="Shuffle word order"
              >
                <Shuffle size={16} />
                Shuffle
              </ToolbarButton>
            </div>
          </div>
        ) : paused ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground shadow-lg shadow-background/50">
            Paused
          </div>
        ) : (
          currentWord && (
            <div className="rounded-xl border border-border bg-surface p-8 shadow-lg shadow-background/50">
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
      </div>

      {/* See VocabTable.tsx's VocabTableGroup for why the scroll wrapper/
          border split (docs/24-responsive-design-plan.md). */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-lg text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Chinese</th>
              <th className="px-3 py-2">Pinyin</th>
              <th className="px-3 py-2">English</th>
            </tr>
          </thead>
          <tbody>
            {order.map((word, index) => {
              const isCorrect = correctIds.has(word.id);
              const isCurrent = index === currentIndex;
              return (
                <tr
                  key={word.id}
                  data-row-index={index}
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
                  <td className="px-3 py-2 text-muted-foreground">
                    {isCorrect ? word.pinyin : "—"}
                  </td>
                  <td className="px-3 py-2">{word.meaning ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
      className={`flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "danger"
          ? "text-danger hover:bg-danger/10"
          : "text-foreground hover:bg-surface-raised"
      }`}
    >
      {children}
    </button>
  );
}
