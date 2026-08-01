// Tone-free, u-flexible pinyin matching -- see docs/06-quiz-mechanics.md's "Answer matching
// rule". NFD-normalizing splits tone marks (and u-umlaut's diaeresis) off as combining
// characters in the U+0300-U+036F block, so stripping that range gives the bare letters. "v"
// is never a legitimate pinyin letter, so a global v->u replace safely covers the ASCII
// nu/nv-for-nu-umlaut convention on the typed side without needing to know which "u"s came
// from a "u-umlaut". All whitespace is stripped (not just trimmed) because a handful of
// source rows store multi-syllable words with an internal space (e.g. "mei guanxi") even
// though the site's rule is to type words as one continuous string.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizePinyin(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/v/g, "u")
    .replace(/\s+/g, "");
}

export function matchesPinyin(typed: string, target: string): boolean {
  const normalizedTyped = normalizePinyin(typed);
  if (!normalizedTyped) return false;
  return normalizedTyped === normalizePinyin(target);
}
