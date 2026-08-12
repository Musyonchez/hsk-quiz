"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Flag, Pause, Play, Shuffle } from "lucide-react";
import { matchesPinyin } from "@/quiz/pinyin-match";
import { formatDuration } from "@/quiz/format-time";
import { withHardSuffix } from "@/quiz/quiz-key";
import { submitAttempt } from "@/quiz/submit-attempt";
import { shuffle } from "@/quiz/shuffle";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { ToolbarButton } from "@/components/ToolbarButton";
import { QuizResultsScreen } from "@/components/QuizResultsScreen";

export type { QuizWord };

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
  // docs/hold/28-progressive-difficulty-plan.md: optional harder tier, blanking
  // the English column too (normally always visible) so the player recalls
  // from Chinese alone instead of Chinese+English. Only settable pre-start
  // (see the ToolbarButton below, rendered only in the !started branch), so
  // once a run begins this can't change mid-run — safe to read directly at
  // submit time without a separate "locked in" ref.
  const [hideSecondColumn, setHideSecondColumn] = useState(false);
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
  // docs/44-audit-quiz-ux-gaps.md / docs/42-audit-frontend-components.md §3:
  // the attempt POST used to be unchecked for res.ok, so a failed save was
  // silently swallowed — the player saw a normal results screen with no clue
  // their score wasn't recorded. submitAttempt (src/quiz/submit-attempt.ts)
  // now reports that back explicitly.
  const [saveFailed, setSaveFailed] = useState(false);
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
  // with a fresh key).
  const effectiveQuizKey = quizKey ? withHardSuffix(quizKey, hideSecondColumn) : quizKey;

  useEffect(() => {
    if (!finished || submittedRef.current || !trackAttempt || !effectiveQuizKey) return;
    submittedRef.current = true;
    const elapsedSeconds = (durationSeconds ?? 0) - secondsLeft;

    submitAttempt(effectiveQuizKey, score, total, elapsedSeconds).then((result) => {
      setBestPercent(result.bestPercent);
      setAvgGlobalPercent(result.avgGlobalPercent);
      setAvgFriendPercent(result.avgFriendPercent);
      setSaveFailed(result.saveFailed);
    });
  }, [finished, trackAttempt, effectiveQuizKey, score, total, secondsLeft, durationSeconds]);

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
      <QuizResultsScreen
        heading={heading}
        percent={percent}
        score={score}
        total={total}
        bestPercent={bestPercent}
        avgGlobalPercent={avgGlobalPercent}
        avgFriendPercent={avgFriendPercent}
        saveFailed={saveFailed}
        trackAttempt={trackAttempt}
        quizKey={effectiveQuizKey}
        backHref={backHref}
        allowDrillMissed={allowDrillMissed}
        missedWords={missedWords}
        onReplay={onReplay}
        onDrillMissed={onDrillMissed}
        showStats={showStats}
        onToggleStats={() => setShowStats((v) => !v)}
        nextQuiz={nextQuiz}
        anotherQuiz={anotherQuiz}
      />
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
            <div className="flex flex-wrap items-center justify-center gap-3">
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
              {/* docs/hold/28-progressive-difficulty-plan.md: opt-in harder tier,
                  set once before Start quiz like Shuffle above — see the
                  hideSecondColumn state comment for why it's safe to read
                  directly (no separate "locked in" value) once a run starts. */}
              <ToolbarButton
                onClick={() => setHideSecondColumn((v) => !v)}
                disabled={false}
                label="Toggle hard mode"
                variant={hideSecondColumn ? "active" : "default"}
              >
                <EyeOff size={16} />
                {hideSecondColumn ? "Hard mode: on" : "Hard mode"}
              </ToolbarButton>
            </div>
            {hideSecondColumn && (
              <p className="text-xs text-muted-foreground">
                English stays hidden too — only the Chinese character shows until you answer.
              </p>
            )}
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
          border split (docs/hold/24-responsive-design-plan.md). */}
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
                  <td className="px-3 py-2">
                    {!hideSecondColumn || isCorrect ? (word.meaning ?? "—") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
