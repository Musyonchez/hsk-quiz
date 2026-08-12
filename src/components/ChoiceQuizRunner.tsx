"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Shuffle } from "lucide-react";
import { formatDuration } from "@/quiz/format-time";
import { buildChoices } from "@/quiz/meaning-choices";
import { submitAttempt } from "@/quiz/submit-attempt";
import { shuffle } from "@/quiz/shuffle";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { ToolbarButton } from "@/components/ToolbarButton";
import { QuizResultsScreen } from "@/components/QuizResultsScreen";

export type { QuizWord };

// Pinyin -> meaning, one word at a time, 5 clickable options instead of a
// text field. See docs/hold/19-meaning-quiz-mode-plan.md for the full design —
// notably: no right/wrong is ever shown until the quiz finishes (a wrong
// answer's distractor set can overlap another word's, so even single-shot
// locking wouldn't stop cross-word leakage from instant feedback), and
// every word's 5 options are generated once at run-start and frozen for
// that run's whole duration, independent of Shuffle (which only reorders
// the questions, not the options).
export function ChoiceQuizRunner({
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
    <ChoiceQuizRunnerInner
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

function ChoiceQuizRunnerInner({
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
  // Frozen for the whole run — generated once here (a lazy initializer, run
  // exactly once per mount) and never touched again, including on Replay/
  // Drill, since those remount this component with a fresh key.
  const [choices] = useState(() => buildChoices(words));
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Right or wrong, right alongside it — this IS the answer key, just never
  // rendered with any color/label until `finished`.
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [finishedState, setFinishedState] = useState<"completed" | "gaveup" | null>(null);
  const finished = finishedState ?? (timed && started && secondsLeft === 0 ? "timeup" : null);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const topStickyRef = useRef<HTMLDivElement>(null);
  const bottomStickyRef = useRef<HTMLDivElement>(null);

  const currentWord = order[currentIndex];
  const total = order.length;
  const answeredCount = answers.size;
  const score = [...answers.entries()].filter(([wordId, picked]) => picked === wordId).length;

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

  // Centers the current row between the top toolbar and the bottom
  // prompt/options bar — this mode has two sticky bars instead of one (see
  // docs/19), so the visible band is the space between them, not "below
  // the top bar" like the typing quiz.
  useEffect(() => {
    if (!started || finished || paused) return;
    const container = containerRef.current;
    const topSticky = topStickyRef.current;
    if (!container || !topSticky) return;
    const row = container.querySelector<HTMLElement>(`[data-row-index="${currentIndex}"]`);
    if (!row) return;

    const topBottom = topSticky.getBoundingClientRect().bottom;
    const bottomTop = bottomStickyRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const remainingSpace = bottomTop - topBottom;
    const rowRect = row.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2;
    const targetCenter = topBottom + remainingSpace / 2;
    window.scrollBy({ top: rowCenter - targetCenter, behavior: "smooth" });
  }, [currentIndex, started, finished, paused]);

  function goTo(index: number) {
    setCurrentIndex(((index % total) + total) % total);
  }

  // Same skip-already-done walk as QuizRunner's nextIncompleteIndex, against
  // "answered" instead of "correct" — see docs/18 §1 (that's where this
  // pattern originates) and docs/19 (why "answered" is the right notion of
  // done here, not "correct").
  function nextIncompleteIndex(from: number, step: 1 | -1): number {
    for (let i = 1; i <= total; i++) {
      const index = (((from + step * i) % total) + total) % total;
      if (!answers.has(order[index].id)) return index;
    }
    return from;
  }

  function pick(wordId: number, pickedId: number) {
    if (answers.has(wordId)) return;
    const updated = new Map(answers).set(wordId, pickedId);
    setAnswers(updated);

    if (updated.size === total) {
      setFinishedState("completed");
      return;
    }

    goTo(nextIncompleteIndex(currentIndex, 1));
  }

  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const heading =
      finished === "timeup" ? "Time's up!" : finished === "gaveup" ? "Quiz ended" : "Quiz complete!";
    const missedWords = order.filter((word) => answers.get(word.id) !== word.id);

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
        quizKey={quizKey}
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

  const currentAnswer = currentWord ? answers.get(currentWord.id) : undefined;
  const currentOptions = currentWord ? (choices.get(currentWord.id) ?? []) : [];

  return (
    <div className="flex flex-col gap-6 pb-4" ref={containerRef}>
      <div
        className="sticky top-[var(--header-height)] z-5 flex flex-col gap-4 bg-background pb-4"
        ref={topStickyRef}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <span className="text-sm font-semibold tabular-nums">
            ANSWERED {answeredCount}/{total}
          </span>
          {timed && (
            <span className="text-sm font-semibold tabular-nums">
              {formatDuration(secondsLeft)}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              onClick={() => goTo(nextIncompleteIndex(currentIndex, -1))}
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
              onClick={() => goTo(nextIncompleteIndex(currentIndex, 1))}
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

        {!started && (
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
        )}
        {started && paused && (
          <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted-foreground shadow-lg shadow-background/50">
            Paused
          </div>
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
              <th className="px-3 py-2">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {order.map((word, index) => {
              const isAnswered = answers.has(word.id);
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
                      : "border-l-4 border-l-transparent border-t border-border hover:bg-surface-raised")
                  }
                >
                  <td className="px-3 py-2 font-medium">{word.chinese}</td>
                  <td className="px-3 py-2 text-muted-foreground">{word.pinyin}</td>
                  {/* Meaning stays hidden until the whole quiz finishes, not just
                      until this one word is answered — showing the real answer
                      the moment it's answered would itself reveal right/wrong
                      by comparison, the exact leak this mode avoids. */}
                  <td className="px-3 py-2 text-muted-foreground">
                    {isAnswered ? "answered" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {started && !finished && !paused && currentWord && (
        <div
          className="sticky bottom-0 z-5 flex flex-col gap-3 border-t border-border bg-surface p-5 shadow-lg shadow-background/50"
          ref={bottomStickyRef}
        >
          <div className="text-center">
            <p className="text-2xl font-bold">{currentWord.chinese}</p>
            <p className="text-muted-foreground">{currentWord.pinyin}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={currentAnswer !== undefined}
                onClick={() => pick(currentWord.id, option.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                  currentAnswer === option.id
                    ? "border-current-row bg-current-row-surface font-medium"
                    : currentAnswer !== undefined
                      ? "border-border opacity-50"
                      : "border-border hover:border-border-strong hover:bg-surface-raised"
                }`}
              >
                {option.meaning ?? "—"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
