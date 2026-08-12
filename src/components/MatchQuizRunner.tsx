"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Flag, Pause, Play, Shuffle } from "lucide-react";
import { formatDuration } from "@/quiz/format-time";
import { submitAttempt } from "@/quiz/submit-attempt";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizLinkCard } from "@/components/QuizLinkCard";
import { VocabTableGroup } from "@/components/VocabTable";

export type { QuizWord };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Chapter-scale matching board (docs/hold/19-meaning-quiz-mode-plan.md): left
// tiles are pinyin+character, right tiles are English meanings. Used to have
// a second "character" variant (docs/hold/27-character-quiz-plan.md, English
// left / Chinese character right, pinyin withheld) — removed as dead code
// once docs/38's Character mode rebuild replaced its only call site with
// CharacterIsland's own browse-then-quiz flow (docs/42-audit-frontend-
// components.md §1 flagged the variant as unreachable; nothing ever passed
// it after that rebuild).
// A closed N-to-N pool, not independently-sampled options like
// ChoiceQuizRunner/CharacterQuizRunner — click one tile in each column to
// make a guess pair. Both tiles clear from the board immediately on any
// guess, right or wrong, with no color/feedback either way (see docs/19):
// if only *correct* pairs disappeared, that disappearing-or-not would
// itself be the exact reveal this mode exists to avoid. A real consequence
// of that: an early wrong guess can strand another word's correct answer
// (its true partner is now gone too) — expected, like a physical
// memory-match game, and Drill missed words is what cleans it up after.
export function MatchQuizRunner({
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
    <MatchQuizRunnerInner
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

function MatchQuizRunnerInner({
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
  const total = words.length;
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const [leftBoard, setLeftBoard] = useState(() => shuffle(words.map((w) => w.id)));
  const [rightBoard, setRightBoard] = useState(() => shuffle(words.map((w) => w.id)));
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  // Tracked the whole time, never rendered with any indication until
  // `finished` — this IS the score, just not shown early.
  const [correctIds, setCorrectIds] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [finishedState, setFinishedState] = useState<"completed" | "gaveup" | null>(null);
  const finished =
    finishedState ??
    (leftBoard.length === 0 ? "completed" : timed && started && secondsLeft === 0 ? "timeup" : null);
  const [bestPercent, setBestPercent] = useState<number | null>(null);
  const [avgGlobalPercent, setAvgGlobalPercent] = useState<number | null>(null);
  const [avgFriendPercent, setAvgFriendPercent] = useState<number | null>(null);
  // docs/44-audit-quiz-ux-gaps.md / docs/42-audit-frontend-components.md §3:
  // see submit-attempt.ts's comment — a failed save used to be silently
  // swallowed here.
  const [saveFailed, setSaveFailed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const statsDefaultSetRef = useRef(false);
  const submittedRef = useRef(false);

  const attemptedCount = total - leftBoard.length;
  const score = correctIds.size;

  useEffect(() => {
    if (!finished || submittedRef.current || !trackAttempt || !quizKey) return;
    submittedRef.current = true;
    const elapsedSeconds = (durationSeconds ?? 0) - secondsLeft;

    submitAttempt(quizKey, score, total, elapsedSeconds).then((result) => {
      setBestPercent(result.bestPercent);
      setAvgGlobalPercent(result.avgGlobalPercent);
      setAvgFriendPercent(result.avgFriendPercent);
      setSaveFailed(result.saveFailed);
    });
  }, [finished, trackAttempt, quizKey, score, total, secondsLeft, durationSeconds]);

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

  // Resolves a guess pair the instant both sides are picked — both tiles
  // clear immediately, right or wrong, with no color either way (see
  // docs/19). This is the only place correctIds gets written.
  function resolvePair(leftId: number, rightId: number) {
    if (leftId === rightId) {
      setCorrectIds((prev) => new Set(prev).add(leftId));
    }
    setLeftBoard((prev) => prev.filter((id) => id !== leftId));
    setRightBoard((prev) => prev.filter((id) => id !== rightId));
    setSelectedLeft(null);
    setSelectedRight(null);
  }

  function pickLeft(id: number) {
    if (!started || paused) return;
    if (selectedRight !== null) {
      resolvePair(id, selectedRight);
      return;
    }
    setSelectedLeft((prev) => (prev === id ? null : id));
  }

  function pickRight(id: number) {
    if (!started || paused) return;
    if (selectedLeft !== null) {
      resolvePair(selectedLeft, id);
      return;
    }
    setSelectedRight((prev) => (prev === id ? null : id));
  }

  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const heading =
      finished === "timeup" ? "Time's up!" : finished === "gaveup" ? "Quiz ended" : "Quiz complete!";
    const missedWords = words.filter((word) => !correctIds.has(word.id));

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
            <p className="text-4xl font-bold tabular-nums text-accent">{percent}%</p>
            <p className="text-sm text-muted-foreground">
              {score} / {total} correct
              {bestPercent !== null && <> · your best: {bestPercent}%</>}
            </p>
            {(avgGlobalPercent !== null || avgFriendPercent !== null) && (
              <p className="text-sm text-muted-foreground">
                {avgGlobalPercent !== null && <>avg score: {avgGlobalPercent}% </>}
                {avgFriendPercent !== null && <>· avg friend score: {avgFriendPercent}%</>}
              </p>
            )}
            {saveFailed && trackAttempt && quizKey && (
              <p className="text-sm text-danger">
                Your score couldn&rsquo;t be saved — check your connection and try Replay.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onReplay} className={pillClasses("primary")}>
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
                <p className="text-sm text-muted-foreground">None — you got every word.</p>
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
    <div className="flex flex-col gap-6">
      <div className="sticky top-[var(--header-height)] z-5 flex flex-col gap-4 bg-background pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <span className="text-sm font-semibold tabular-nums">
            MATCHED {attemptedCount}/{total}
          </span>
          {timed && (
            <span className="text-sm font-semibold tabular-nums">
              {formatDuration(secondsLeft)}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
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
              {total} words to match
              {timed && <> · {formatDuration(durationSeconds ?? 0)} on the clock</>}
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className={pillClasses("primary")}
            >
              Start quiz
            </button>
          </div>
        ) : paused ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground shadow-lg shadow-background/50">
            Paused
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Click a word, then click its meaning.
          </p>
        )}
      </div>

      {started && !paused && (
        // A single grid, not two independent flex-col columns — leftBoard[i]
        // and rightBoard[i] are two unrelated words (each board is shuffled
        // independently, on purpose, for the memory-match mechanic), but
        // their tiles still need to sit in the same grid row so a taller
        // wrapped meaning on one side doesn't push every row below it out of
        // horizontal alignment with the other column. Native grid row-sizing
        // (each row auto-sizes to its tallest cell) handles this for free;
        // two separate flex-col stacks never could.
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {leftBoard.map((leftId, i) => {
            const rightId = rightBoard[i];
            const leftWord = byId.get(leftId)!;
            const rightWord = byId.get(rightId)!;
            return (
              <Fragment key={leftId}>
                <button
                  type="button"
                  onClick={() => pickLeft(leftId)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selectedLeft === leftId
                      ? "border-current-row bg-current-row-surface font-medium"
                      : "border-border hover:border-border-strong hover:bg-surface-raised"
                  }`}
                >
                  <span className="font-medium">{leftWord.chinese}</span>{" "}
                  <span className="text-muted-foreground">{leftWord.pinyin}</span>
                </button>
                <button
                  type="button"
                  onClick={() => pickRight(rightId)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selectedRight === rightId
                      ? "border-current-row bg-current-row-surface font-medium"
                      : "border-border hover:border-border-strong hover:bg-surface-raised"
                  }`}
                >
                  {rightWord.meaning ?? "—"}
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
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
        variant === "danger" ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-surface-raised"
      }`}
    >
      {children}
    </button>
  );
}
