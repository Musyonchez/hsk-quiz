"use client";

// Powers the "info dump" fix (docs/48-quiz-pre-start-progressive-reveal-plan.md):
// QuizRunner/ChoiceQuizRunner/CharacterBrowse all show their full word list
// pre-start, which is fine at chapter scale but overwhelming for a large
// custom-quiz/All-Words selection. Reveals in three tiers — an initial small
// slice, +1 chunk on the first click (still plausibly "just double-checking a
// couple more"), everything on the second click (a stronger signal the
// player actually wants the whole list) — rather than a numbered pager,
// since this is a one-way "show me more," not real pagination.
import { useState } from "react";

export function useProgressiveReveal<T>(items: T[], chunkSize = 20) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const visibleCount =
    stage === 0 ? chunkSize : stage === 1 ? chunkSize * 2 : items.length;
  const visible = items.slice(0, visibleCount);
  const hasMore = visible.length < items.length;

  return {
    visible,
    hasMore,
    revealMore: () => setStage((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s)),
  };
}
