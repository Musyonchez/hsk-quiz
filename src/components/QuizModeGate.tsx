"use client";

import { useState } from "react";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { pillClasses } from "@/components/pill-classes";
import { QuizRunner } from "@/components/QuizRunner";
import { ChoiceQuizRunner } from "@/components/ChoiceQuizRunner";
import { MatchQuizRunner } from "@/components/MatchQuizRunner";
import { CharacterIsland } from "@/components/CharacterIsland";

// Exactly 3 self-contained modes (docs/38) — Pinyin, Character, English
// ("Match meaning", renamed for parity with the naming scheme) — picked
// before any words are shown, then the matching runner takes over. There is
// no separate "Study" mode: the word-browse grid/popup that used to be its
// own button is folded entirely into Character mode's own flow (see
// CharacterIsland). `meaningVariant` picks which scale-specific component
// fits English mode's scale: chapters get a click-to-pair matching board
// (MatchQuizRunner), combined/custom quizzes get the one-word-at-a-time flow
// (ChoiceQuizRunner) — see docs/19 for why those differ. Character mode has
// no such split — every scale, chapter included, gets the same CharacterIsland
// browse-then-quiz flow (the old chapter-scale click-to-pair board for
// Character is gone; direct feedback after shipping docs/38 was that the new
// flow should replace it everywhere, not just combined/custom/all-words) —
// `characterMode` alone gates whether the Character button shows at all
// (not `characterQuizKey` — the cross-level custom-quiz pages deliberately
// pass no quiz keys at all, since `trackAttempt` is false there), so pages
// can opt in incrementally without breaking callers that haven't wired
// Character mode yet.
export function QuizModeGate({
  words,
  backHref,
  typeQuizKey,
  meaningQuizKey,
  characterQuizKey,
  trackAttempt = true,
  allowDrillMissed = false,
  meaningVariant,
  characterMode = false,
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
  characterMode?: boolean;
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
  const characterModeAvailable = characterMode;

  // Play Next/Play Another should continue in the same mode the player just
  // used, not dump them back on the mode picker (docs/hold/22-audit-pass-4.md) —
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
            English
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
    return (
      <CharacterIsland
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
