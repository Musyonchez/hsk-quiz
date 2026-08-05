// Builds the 5-option (1 correct + up to 4 distractors) answer set for the
// pinyin->meaning quiz mode (docs/19-meaning-quiz-mode-plan.md). Pure and
// framework-free like pinyin-match.ts/format-time.ts — called once per run
// start (see docs/19), never regenerated on a mid-run revisit.

export type ChoiceWord = { id: number; meaning: string | null };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// One target's shuffled option list (its own word among up to 4 distractors,
// at a random position). Distractors are pulled from the rest of `pool`,
// excluding any word whose meaning text exactly matches the target's (two
// entries can legitimately share a meaning — e.g. two readings of the same
// character — and showing both as options would create two "correct"
// answers).
export function buildChoicesFor<T extends ChoiceWord>(target: T, pool: T[]): T[] {
  const candidates = pool.filter(
    (word) => word.id !== target.id && word.meaning !== target.meaning
  );
  const distractors = shuffle(candidates).slice(0, 4);
  return shuffle([target, ...distractors]);
}

// Every word's option set, computed together so the whole run's choices are
// generated (and frozen) in one call at run-start.
export function buildChoices<T extends ChoiceWord>(words: T[]): Map<number, T[]> {
  const choices = new Map<number, T[]>();
  for (const word of words) {
    choices.set(word.id, buildChoicesFor(word, words));
  }
  return choices;
}
