"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, Flag, Pause, Play } from "lucide-react";
import { formatDuration } from "@/quiz/format-time";
import { submitAttempt } from "@/quiz/submit-attempt";
import { shuffle } from "@/quiz/shuffle";
import { withHardSuffix } from "@/quiz/quiz-key";
import { useProgressiveReveal } from "@/lib/use-progressive-reveal";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { ToolbarButton } from "@/components/ToolbarButton";
import { QuizResultsScreen } from "@/components/QuizResultsScreen";
import { SpeakerButton } from "@/components/SpeakerButton";
import { RevealMoreButton } from "@/components/RevealMoreButton";

export type { QuizWord };

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
  // docs/hold/28-progressive-difficulty-plan.md's opt-in harder tier, extended
  // to this mode per direct request: pinyin is this mode's own equivalent of
  // Pinyin mode's "second column" to hide (this mode's actual answer is
  // meaning, which is already always visible on the right board — that's the
  // whole mechanic — so pinyin is the one thing left that can be hidden for
  // an extra challenge). Settable pre-start only, same as every other
  // runner's hard-mode toggle.
  const [hidePinyin, setHidePinyin] = useState(false);
  // Pre-start word list (docs/48's "info dump" fix, extended here per direct
  // request) — Meaning is dashed out below to match Pinyin/Choice mode's own
  // pre-start tables hiding their answer column, for consistency across all
  // four runners. Keyed off `words` (the stable full list), not
  // `leftBoard`/`rightBoard`, which shrink as pairs resolve during play.
  const { visible: visibleWords, hasMore: hasMoreWords, revealMore: revealMoreWords } =
    useProgressiveReveal(words);
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
  const effectiveQuizKey = quizKey ? withHardSuffix(quizKey, hidePinyin) : quizKey;

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
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStarted(true)}
                className={pillClasses("primary")}
              >
                Start quiz
              </button>
              {/* Set once before Start quiz — see hidePinyin's state comment
                  for why it's safe to read directly (no separate "locked in"
                  value) once a run starts. */}
              <ToolbarButton
                onClick={() => setHidePinyin((v) => !v)}
                disabled={false}
                label="Toggle hard mode"
                variant={hidePinyin ? "active" : "default"}
              >
                <EyeOff size={16} />
                {hidePinyin ? "Hard mode: on" : "Hard mode"}
              </ToolbarButton>
            </div>
            {hidePinyin && (
              <p className="text-xs text-muted-foreground">
                Pinyin stays hidden too — only the Chinese character shows on the board.
              </p>
            )}
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

      {!started && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-lg text-sm">
            <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Chinese</th>
                <th className="px-3 py-2">Pinyin</th>
                <th className="px-3 py-2">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {visibleWords.map((word) => (
                <tr key={word.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {word.chinese}
                      <SpeakerButton text={word.chinese} kind="word" />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {hidePinyin ? "—" : word.pinyin}
                  </td>
                  {/* Dashed out to match Pinyin mode's own pre-start table
                      hiding its answer column — consistency with that
                      pattern, not a spoiler-prevention need specific to this
                      mode (see docs/48-quiz-pre-start-progressive-reveal-plan.md). */}
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          <RevealMoreButton hasMore={hasMoreWords} onClick={revealMoreWords} />
        </div>
      )}

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
                  <span className="font-medium">{leftWord.chinese}</span>
                  {!hidePinyin && (
                    <>
                      {" "}
                      <span className="text-muted-foreground">{leftWord.pinyin}</span>
                    </>
                  )}
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
