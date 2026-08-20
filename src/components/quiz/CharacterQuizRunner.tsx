"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Shuffle, SkipForward } from "lucide-react";
import { matchesPinyin } from "@/quiz/pinyin-match";
import { formatDuration } from "@/quiz/format-time";
import { buildChoices } from "@/quiz/meaning-choices";
import { shuffle } from "@/quiz/shuffle";
import { useQuizRunLifecycle } from "@/quiz/use-quiz-run-lifecycle";
import { useQuizAttemptSubmission, useStatsVisibility } from "@/quiz/use-quiz-attempt-submission";
import { useQuizCountdown } from "@/quiz/use-quiz-countdown";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { ToolbarButton } from "@/components/ToolbarButton";
import { QuizResultsScreen } from "@/components/quiz/QuizResultsScreen";
import { SaveWordButton } from "@/components/SaveWordButton";

export type { QuizWord };

type AnswerFormat = "pinyin" | "english";

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
  const {
    runId,
    activeWords,
    activeTrackAttempt,
    activeDurationSeconds,
    onReplay,
    onDrillMissed,
  } = useQuizRunLifecycle(words, trackAttempt, durationSeconds);

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
      onReplay={onReplay}
      onDrillMissed={onDrillMissed}
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
  const [paused, setPaused] = useState(false);
  const [finishedState, setFinishedState] = useState<"completed" | "gaveup" | null>(null);
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

  const { secondsLeft, finished } = useQuizCountdown({
    timed,
    started,
    paused,
    finishedState,
    durationSeconds,
  });
  // Note: unlike the other three runners, this one never passes a
  // withHardSuffix-adjusted quizKey — CharacterQuizRunner has no Hard-mode
  // toggle (docs/50 full-sweep audit §10: character mode is already the
  // harder variant of pinyin/English modes, so an additional hard tier
  // wasn't added on top of it).
  const { bestPercent, avgGlobalPercent, avgFriendPercent, saveFailed } =
    useQuizAttemptSubmission({
      finished,
      trackAttempt,
      quizKey,
      score,
      total,
      secondsLeft,
      durationSeconds,
    });
  const { showStats, toggleStats } = useStatsVisibility({ finished, score, total });

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
        onToggleStats={toggleStats}
        nextQuiz={nextQuiz}
        anotherQuiz={anotherQuiz}
      />
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
              list at the very end). aria-live/aria-atomic so a screen-reader
              user actually hears it update in real time too, not just sees
              it — same reasoning the sighted-only version existed for. */}
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-semibold tabular-nums text-danger"
          >
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
        <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-lg shadow-background/50">
          {/* docs/57 §1's revised placement rule — the plus icon is safe
              here: the character is already shown unmasked, and this mode
              has no Hard-mode toggle at all to leak anything from. No
              speaker icon here though (docs/58 finding 58-1's fix) — this
              card only ever renders while a run is in progress (there's no
              pre-start version of it), and playing a word's pronunciation
              mid-quiz would hand the player its pinyin out loud, exactly
              what the pinyin-typing format is testing. */}
          <SaveWordButton
            chinese={currentWord.chinese}
            pinyin={currentWord.pinyin}
            meaning={currentWord.meaning}
            className="absolute left-3 top-3"
          />
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
              aria-label={`Type the pinyin for ${currentWord.chinese}`}
              className="mx-auto mt-4 w-full max-w-xs rounded border border-border bg-transparent px-3 py-2 text-center outline-none focus:border-focus-ring"
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
        <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface p-8 shadow-lg shadow-background/50">
          {/* Plus icon only, no speaker — same reasoning as the pinyin-format
              card above (this format doesn't test pinyin recall, but kept
              consistent: no speaker icon anywhere while a run is in
              progress, docs/58 finding 58-1's fix). */}
          <SaveWordButton
            chinese={currentWord.chinese}
            pinyin={currentWord.pinyin}
            meaning={currentWord.meaning}
            className="absolute left-3 top-3"
          />
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
