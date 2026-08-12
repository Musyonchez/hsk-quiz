"use client";

import { useState } from "react";
import type { QuizNavTarget } from "@/quiz/quiz-navigation";
import type { QuizWord } from "@/quiz/types";
import { CharacterBrowse } from "@/components/CharacterBrowse";
import { CharacterQuizRunner } from "@/components/CharacterQuizRunner";

// The Character island (docs/38) — one self-contained flow, not two modes
// reached separately. Opens on the browse grid/popup (part 1); "Start quiz"
// moves into the quiz half (part 2, its own Pinyin-test/English-test
// picker). There's no going "back" to browse once the quiz starts — same as
// every other quiz runner in this app not offering a mid-run bail beyond
// Give up.
export function CharacterIsland({
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
  const [stage, setStage] = useState<"browse" | "quiz">("browse");

  if (stage === "browse") {
    return <CharacterBrowse words={words} onStartQuiz={() => setStage("quiz")} />;
  }

  return (
    <CharacterQuizRunner
      words={words}
      backHref={backHref}
      quizKey={quizKey}
      trackAttempt={trackAttempt}
      allowDrillMissed={allowDrillMissed}
      nextQuiz={nextQuiz}
      anotherQuiz={anotherQuiz}
      durationSeconds={durationSeconds}
    />
  );
}
