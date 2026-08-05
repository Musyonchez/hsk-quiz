"use client";

import { useState } from "react";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizRunner } from "@/components/QuizRunner";
import { ChoiceQuizRunner } from "@/components/ChoiceQuizRunner";
import { MatchQuizRunner } from "@/components/MatchQuizRunner";

// Lets the player pick "Type pinyin" (the original quiz) or "Match meaning"
// (docs/19-meaning-quiz-mode-plan.md) before any words are shown, then
// renders the matching runner. `meaningVariant` picks which meaning-mode
// component fits the quiz's scale: chapters get the click-to-pair matching
// board (MatchQuizRunner), combined/custom quizzes get the one-word-at-a-
// time 5-choice flow (ChoiceQuizRunner) — see docs/19 for why those differ.
export function QuizModeGate({
  words,
  backHref,
  typeQuizKey,
  meaningQuizKey,
  trackAttempt = true,
  allowDrillMissed = false,
  meaningVariant,
  nextQuiz = null,
  anotherQuiz,
  durationSeconds,
}: {
  words: QuizWord[];
  backHref: string;
  typeQuizKey?: string;
  meaningQuizKey?: string;
  trackAttempt?: boolean;
  allowDrillMissed?: boolean;
  meaningVariant: "choice" | "match";
  nextQuiz?: QuizNavTarget | null;
  anotherQuiz?: QuizNavTarget;
  durationSeconds?: number;
}) {
  const [mode, setMode] = useState<"type" | "meaning" | null>(null);

  if (mode === null) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center shadow-lg shadow-background/50">
        <p className="text-muted-foreground">Pick a quiz mode.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMode("type")}
            className={pillClasses("primary")}
          >
            Type pinyin
          </button>
          <button
            type="button"
            onClick={() => setMode("meaning")}
            className={pillClasses("secondary")}
          >
            Match meaning
          </button>
        </div>
      </div>
    );
  }

  if (mode === "type") {
    return (
      <QuizRunner
        words={words}
        backHref={backHref}
        quizKey={typeQuizKey}
        trackAttempt={trackAttempt}
        allowDrillMissed={allowDrillMissed}
        nextQuiz={nextQuiz}
        anotherQuiz={anotherQuiz}
        durationSeconds={durationSeconds}
      />
    );
  }

  return meaningVariant === "match" ? (
    <MatchQuizRunner
      words={words}
      backHref={backHref}
      quizKey={meaningQuizKey}
      trackAttempt={trackAttempt}
      allowDrillMissed={allowDrillMissed}
      nextQuiz={nextQuiz}
      anotherQuiz={anotherQuiz}
      durationSeconds={durationSeconds}
    />
  ) : (
    <ChoiceQuizRunner
      words={words}
      backHref={backHref}
      quizKey={meaningQuizKey}
      trackAttempt={trackAttempt}
      allowDrillMissed={allowDrillMissed}
      nextQuiz={nextQuiz}
      anotherQuiz={anotherQuiz}
      durationSeconds={durationSeconds}
    />
  );
}
