// Builds the candidate-row options for the Combined/Custom-scale character
// quiz (docs/27-character-quiz-plan.md) — the meaning->character equivalent
// of meaning-choices.ts's pinyin->meaning options, but ranked rather than
// purely random: a distractor that's actually plausible (a homophone, or a
// word that starts the same way) is what makes reading recall a real skill
// being tested, not a coin flip between five random characters.

import { normalizePinyin } from "./pinyin-match";

export type CharacterChoiceWord = { id: number; chinese: string; pinyin: string };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A crude proxy for "starts with the same syllable" — there's no syllable
// dictionary in this codebase to segment pinyin properly (words are stored
// as one continuous string per docs/06-quiz-mechanics.md), so comparing the
// first couple of normalized letters is close enough to catch words that
// *sound* similar (e.g. 还是/还有) without needing real segmentation.
function normalizedPrefix(pinyin: string): string {
  return normalizePinyin(pinyin.split("/")[0]).slice(0, 2);
}

// One target's ranked, shuffled option list (itself among up to 4
// distractors). Distractor tiers, most-plausible first:
//   1. True homophones — same tone-stripped pinyin, different character.
//   2. Same normalized 2-letter prefix (a "sounds like it starts the same"
//      proxy for a shared syllable onset).
//   3. Random fill from the rest of the pool, same fallback meaning-choices
//      already uses when a pool doesn't have enough plausible near-misses.
// Excludes any word whose Chinese text exactly matches the target's, same
// reasoning meaning-choices.ts uses for `meaning` — avoids a pool entry
// that's actually the same answer showing up as a "wrong" option.
export function buildCharacterChoicesFor<T extends CharacterChoiceWord>(
  target: T,
  pool: T[],
): T[] {
  const others = pool.filter((word) => word.id !== target.id && word.chinese !== target.chinese);
  const targetPinyin = normalizePinyin(target.pinyin.split("/")[0]);
  const targetPrefix = normalizedPrefix(target.pinyin);

  const homophones = others.filter(
    (word) => normalizePinyin(word.pinyin.split("/")[0]) === targetPinyin,
  );
  const sharedPrefix = others.filter(
    (word) => !homophones.includes(word) && normalizedPrefix(word.pinyin) === targetPrefix,
  );
  const rest = others.filter(
    (word) => !homophones.includes(word) && !sharedPrefix.includes(word),
  );

  const distractors = [
    ...shuffle(homophones),
    ...shuffle(sharedPrefix),
    ...shuffle(rest),
  ].slice(0, 4);

  return shuffle([target, ...distractors]);
}

// Every word's option set, computed together so the whole run's choices are
// generated (and frozen) in one call at run-start — same pattern as
// meaning-choices.ts's buildChoices.
export function buildCharacterChoices<T extends CharacterChoiceWord>(
  words: T[],
): Map<number, T[]> {
  const choices = new Map<number, T[]>();
  for (const word of words) {
    choices.set(word.id, buildCharacterChoicesFor(word, words));
  }
  return choices;
}
