// Tone-free, u-flexible pinyin matching -- see docs/06-quiz-mechanics.md's "Answer matching
// rule". NFD-normalizing splits tone marks (and u-umlaut's diaeresis) off as combining
// characters in the U+0300-U+036F block, so stripping that range gives the bare letters. "v"
// is never a legitimate pinyin letter, so a global v->u replace safely covers the ASCII
// nu/nv-for-nu-umlaut convention on the typed side without needing to know which "u"s came
// from a "u-umlaut". All whitespace is stripped (not just trimmed) because a handful of
// source rows store multi-syllable words with an internal space (e.g. "mei guanxi") even
// though the site's rule is to type words as one continuous string.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Some source rows mark an optional syllable in parentheses (ASCII or full-width) rather than
// a separate column, e.g. "n\u00e1n (f\u0101ng)" for \u5357\uff08\u65b9\uff09, "(d\u00e0i)t\u00ec" for (\u4ee3)\u66ff \u2014 the parenthesized
// part is a dictionary-convention gloss on the *character* side, not something the player is
// meant to type. Dropped entirely (not just the punctuation) before normalizing so the target
// becomes just the mandatory syllables \u2014 see docs/hold/12-audit-pass-3-bugs.md.
const PARENTHETICAL = /[\uff08(][^\uff09)]*[\uff09)]/g;

export function normalizePinyin(input: string): string {
  return input
    .replace(PARENTHETICAL, "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/v/g, "u")
    .replace(/\s+/g, "");
}

export function matchesPinyin(typed: string, target: string): boolean {
  const normalizedTyped = normalizePinyin(typed);
  if (!normalizedTyped) return false;
  // A handful of source rows record tone-sandhi alternates as "bù / bú" for
  // one word (不) rather than picking a single citation form — split on "/"
  // and accept a match against any one alternate, instead of requiring the
  // literal (untypeable) "bu/bu" the old single-normalize path produced.
  return target
    .split("/")
    .map(normalizePinyin)
    .some((alternate) => alternate === normalizedTyped);
}
