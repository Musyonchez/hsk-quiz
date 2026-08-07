"use client";

import { useState } from "react";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizRunner } from "@/components/QuizRunner";
import { ChoiceQuizRunner } from "@/components/ChoiceQuizRunner";
import { MatchQuizRunner } from "@/components/MatchQuizRunner";
import { CharacterQuizRunner } from "@/components/CharacterQuizRunner";

// Lets the player pick "Type pinyin" (the original quiz), "Match meaning"
// (docs/19-meaning-quiz-mode-plan.md), or "Character" (docs/27-character-
// quiz-plan.md) before any words are shown, then renders the matching
// runner. `meaningVariant`/`characterVariant` each pick which scale-specific
// component fits the quiz's scale: chapters get a click-to-pair matching
// board (MatchQuizRunner), combined/custom quizzes get the one-word-at-a-
// time flow (ChoiceQuizRunner/CharacterQuizRunner) — see docs/19 and
// docs/27 for why those differ. `characterQuizKey`/`characterVariant` are
// both optional so pages can opt in incrementally without breaking callers
// that haven't wired Character mode yet — omitting either hides the button.
export function QuizModeGate({
  words,
  backHref,
  typeQuizKey,
  meaningQuizKey,
  characterQuizKey,
  trackAttempt = true,
  allowDrillMissed = false,
  meaningVariant,
  characterVariant,
  nextQuiz = null,
  anotherQuiz,
  durationSeconds,
  initialMode = null,
}: {
  words: QuizWord[];
  backHref: string;
  typeQuizKey?: string;
  meaningQuizKey?: string;
  characterQuizKey?: string;
  trackAttempt?: boolean;
  allowDrillMissed?: boolean;
  meaningVariant: "choice" | "match";
  characterVariant?: "choice" | "match";
  nextQuiz?: QuizNavTarget | null;
  anotherQuiz?: QuizNavTarget;
  durationSeconds?: number;
  // Set by the linking page (e.g. "Type pinyin"/"Match meaning" buttons on
  // the chapter/combined Learn page, ?mode= in the URL) to skip the picker
  // screen entirely — one click from the Learn page straight into the quiz
  // instead of two. Falls back to the picker when absent (e.g. a bookmarked
  // /quiz URL with no ?mode=).
  initialMode?: "type" | "meaning" | "character" | null;
}) {
  const [mode, setMode] = useState<"type" | "meaning" | "character" | null>(initialMode);
  const characterModeAvailable = characterVariant !== undefined;

  // Play Next/Play Another should continue in the same mode the player just
  // used, not dump them back on the mode picker (docs/22-audit-pass-4.md) —
  // getQuizNavigation builds bare hrefs with no ?mode=, so it's appended
  // here once the active mode is known, rather than needing every quiz page
  // to know which mode will eventually be chosen client-side.
  function withMode(target: QuizNavTarget): QuizNavTarget {
    return { ...target, href: `${target.href}?mode=${mode}` };
  }
  const nextQuizWithMode = nextQuiz ? withMode(nextQuiz) : null;
  const anotherQuizWithMode = anotherQuiz ? withMode(anotherQuiz) : undefined;

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
          {characterModeAvailable && (
            <button
              type="button"
              onClick={() => setMode("character")}
              className={pillClasses("secondary")}
            >
              Character
            </button>
          )}
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
        nextQuiz={nextQuizWithMode}
        anotherQuiz={anotherQuizWithMode}
        durationSeconds={durationSeconds}
      />
    );
  }

  if (mode === "character") {
    return characterVariant === "match" ? (
      <MatchQuizRunner
        words={words}
        backHref={backHref}
        quizKey={characterQuizKey}
        trackAttempt={trackAttempt}
        allowDrillMissed={allowDrillMissed}
        variant="character"
        nextQuiz={nextQuizWithMode}
        anotherQuiz={anotherQuizWithMode}
        durationSeconds={durationSeconds}
      />
    ) : (
      <CharacterQuizRunner
        words={words}
        backHref={backHref}
        quizKey={characterQuizKey}
        trackAttempt={trackAttempt}
        allowDrillMissed={allowDrillMissed}
        nextQuiz={nextQuizWithMode}
        anotherQuiz={anotherQuizWithMode}
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
      nextQuiz={nextQuizWithMode}
      anotherQuiz={anotherQuizWithMode}
      durationSeconds={durationSeconds}
    />
  ) : (
    <ChoiceQuizRunner
      words={words}
      backHref={backHref}
      quizKey={meaningQuizKey}
      trackAttempt={trackAttempt}
      allowDrillMissed={allowDrillMissed}
      nextQuiz={nextQuizWithMode}
      anotherQuiz={anotherQuizWithMode}
      durationSeconds={durationSeconds}
    />
  );
}
