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
  SkipForward,
} from "lucide-react";
import { matchesPinyin } from "@/quiz/pinyin-match";
import { formatDuration } from "@/quiz/format-time";
import { buildChoices } from "@/quiz/meaning-choices";
import { submitAttempt } from "@/quiz/submit-attempt";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizLinkCard } from "@/components/QuizLinkCard";
import { VocabTableGroup } from "@/components/VocabTable";

export type { QuizWord };

type AnswerFormat = "pinyin" | "english";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Character island, part 2 (docs/38) — a from-scratch rewrite, no longer the
// single fixed meaning->pinyin->candidate-row mechanic. The player picks one
// of two mutually exclusive answer formats up front: type the pinyin from
// the character (reuses matchesPinyin, gets a Skip button, same feel as the
// Pinyin island even though the two stay separate per docs/38), or select
// the English meaning from options (reuses buildChoices, pick-to-advance,
// no Skip needed). Both formats get a live "Missed: N" counter, per the
// word-drill reference project docs/38 cites for that mechanic.
export function CharacterQuizRunner({
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
    <CharacterQuizRunnerInner
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

function CharacterQuizRunnerInner({
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
  // Frozen for the whole run, same reasoning as ChoiceQuizRunner's `choices`
  // — generated once at mount regardless of which answer format ends up
  // picked, since it costs nothing to have ready either way.
  const [englishChoices] = useState(() => buildChoices(words));
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedPinyin, setTypedPinyin] = useState("");
  // Pinyin format: two disjoint sets instead of ChoiceQuizRunner's single
  // answers map, since typing has a third outcome multiple-choice doesn't —
  // "given up on via Skip" isn't "correct" or "not yet answered".
  const [correctIds, setCorrectIds] = useState<Set<number>>(new Set());
  const [missedIds, setMissedIds] = useState<Set<number>>(new Set());
  // English format: same shape as ChoiceQuizRunner's answers map.
  const [pickedAnswers, setPickedAnswers] = useState<Map<number, number>>(new Map());
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [finishedState, setFinishedState] = useState<"completed" | "gaveup" | null>(null);
  const finished = finishedState ?? (timed && answerFormat && secondsLeft === 0 ? "timeup" : null);
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
  const pinyinInputRef = useRef<HTMLInputElement>(null);

  const currentWord = order[currentIndex];
  const total = order.length;
  const started = answerFormat !== null;

  const answeredCount =
    answerFormat === "pinyin" ? correctIds.size + missedIds.size : pickedAnswers.size;
  const score =
    answerFormat === "pinyin"
      ? correctIds.size
      : [...pickedAnswers.entries()].filter(([wordId, picked]) => picked === wordId).length;
  const missedCount =
    answerFormat === "pinyin"
      ? missedIds.size
      : [...pickedAnswers.entries()].filter(([wordId, picked]) => picked !== wordId).length;

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

  useEffect(() => {
    if (started && answerFormat === "pinyin" && !finished && !paused) {
      pinyinInputRef.current?.focus();
    }
  }, [currentIndex, started, answerFormat, finished, paused]);

  function goTo(index: number) {
    setCurrentIndex(((index % total) + total) % total);
    setTypedPinyin("");
  }

  function nextIncompleteIndex(from: number, step: 1 | -1, doneIds: Set<number>): number {
    for (let i = 1; i <= total; i++) {
      const index = (((from + step * i) % total) + total) % total;
      if (!doneIds.has(order[index].id)) return index;
    }
    return from;
  }

  const doneIds =
    answerFormat === "pinyin"
      ? new Set([...correctIds, ...missedIds])
      : new Set(pickedAnswers.keys());

  function handlePinyinChange(value: string) {
    setTypedPinyin(value);
    if (!currentWord || !matchesPinyin(value, currentWord.pinyin)) return;

    const updated = new Set(correctIds).add(currentWord.id);
    setCorrectIds(updated);
    setTypedPinyin("");

    if (updated.size + missedIds.size === total) {
      setFinishedState("completed");
      return;
    }
    goTo(nextIncompleteIndex(currentIndex, 1, new Set([...updated, ...missedIds])));
  }

  function skipCurrent() {
    if (!currentWord || doneIds.has(currentWord.id)) return;
    const updated = new Set(missedIds).add(currentWord.id);
    setMissedIds(updated);

    if (correctIds.size + updated.size === total) {
      setFinishedState("completed");
      return;
    }
    goTo(nextIncompleteIndex(currentIndex, 1, new Set([...correctIds, ...updated])));
  }

  function pickEnglish(wordId: number, pickedId: number) {
    if (pickedAnswers.has(wordId)) return;
    const updated = new Map(pickedAnswers).set(wordId, pickedId);
    setPickedAnswers(updated);

    if (updated.size === total) {
      setFinishedState("completed");
      return;
    }
    goTo(nextIncompleteIndex(currentIndex, 1, new Set(updated.keys())));
  }

  if (finished) {
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const heading =
      finished === "timeup" ? "Time's up!" : finished === "gaveup" ? "Quiz ended" : "Quiz complete!";
    const missedWords =
      answerFormat === "pinyin"
        ? order.filter((word) => !correctIds.has(word.id))
        : order.filter((word) => pickedAnswers.get(word.id) !== word.id);

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

  const currentEnglishAnswer = currentWord ? pickedAnswers.get(currentWord.id) : undefined;
  const currentEnglishOptions = currentWord ? (englishChoices.get(currentWord.id) ?? []) : [];

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="sticky top-[var(--header-height)] z-5 flex flex-col gap-4 bg-background pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <span className="text-sm font-semibold tabular-nums">
            ANSWERED {answeredCount}/{total}
          </span>
          {/* Live "Missed: N" counter, upper-right — docs/38, the one
              mechanic borrowed from the word-drill reference project this
              app didn't have before (existing runners only compute a missed
              list at the very end). */}
          <span className="text-sm font-semibold tabular-nums text-danger">
            Missed: {missedCount}
          </span>
          {timed && (
            <span className="text-sm font-semibold tabular-nums">
              {formatDuration(secondsLeft)}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              onClick={() => goTo(nextIncompleteIndex(currentIndex, -1, doneIds))}
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
              onClick={() => goTo(nextIncompleteIndex(currentIndex, 1, doneIds))}
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
            {/* The answer-format picker — mutually exclusive, per docs/38.
                Picking either starts the run immediately; there's no
                separate generic "Start quiz" button once a format's chosen. */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAnswerFormat("pinyin")}
                className={pillClasses("primary")}
              >
                Pinyin test
              </button>
              <button
                type="button"
                onClick={() => setAnswerFormat("english")}
                className={pillClasses("primary")}
              >
                English test
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

      {started && !finished && !paused && currentWord && answerFormat === "pinyin" && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-lg shadow-background/50">
          <div
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={total}
            className="h-1 overflow-hidden rounded-full bg-surface-raised"
          >
            <div
              className="h-full rounded-full bg-accent-secondary transition-[width]"
              style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }}
            />
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{currentWord.chinese}</p>
            <input
              ref={pinyinInputRef}
              type="text"
              value={typedPinyin}
              onChange={(e) => handlePinyinChange(e.target.value)}
              autoFocus
              placeholder="type the pinyin"
              className="mx-auto mt-4 w-full max-w-xs rounded border border-border bg-transparent px-3 py-2 text-center outline-none focus:border-border-strong"
            />
          </div>
          <button
            type="button"
            onClick={skipCurrent}
            className={pillClasses("secondary") + " mx-auto flex items-center gap-1.5"}
          >
            <SkipForward size={16} />
            Skip
          </button>
        </div>
      )}

      {started && !finished && !paused && currentWord && answerFormat === "english" && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-lg shadow-background/50">
          <div
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={total}
            className="h-1 overflow-hidden rounded-full bg-surface-raised"
          >
            <div
              className="h-full rounded-full bg-accent-secondary transition-[width]"
              style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-center text-4xl font-bold">{currentWord.chinese}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentEnglishOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={currentEnglishAnswer !== undefined}
                onClick={() => pickEnglish(currentWord.id, option.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                  currentEnglishAnswer === option.id
                    ? "border-current-row bg-current-row-surface font-medium"
                    : currentEnglishAnswer !== undefined
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
