import type { CombinedVocabRow } from "./pdf-vocab-table";

// Corrections found by diffing our combined-word extraction (sourced from
// raw/HSK-All-Levels-Vocabulary, a third-party digmandarin.com word list)
// against the official "生词 New Words" appendix in the HSK Standard Course 1
// textbook itself (raw/hsk1/HSK 1 standard course.pdf, pages 120-127). See the
// git log around this file for the page-by-page transcription this was
// checked against.
//
// Two kinds of fix:
// - `replace`: the source PDF paired the right pinyin with the wrong
//   character (e.g. pinyin "fàndiàn" attached to 饭馆 instead of 饭店 — the
//   character that actually matches both the pinyin and the official
//   syllabus), or used a different-but-related word than the one HSK1
//   actually teaches (号 vs 日, 没有 vs 没).
// - `add`: words the official syllabus includes that were missing from the
//   source PDF entirely.
const HSK1_REPLACEMENTS: Record<string, CombinedVocabRow> = {
  饭馆: { chinese: "饭店", pinyin: "fàndiàn", english: "hotel, restaurant", category: "Noun" },
  日: { chinese: "号", pinyin: "hào", english: "date, number", category: "Noun" },
  没: { chinese: "没有", pinyin: "méiyǒu", english: "there is not", category: "Adverb" },
};

const HSK1_ADDITIONS: CombinedVocabRow[] = [
  { chinese: "说", pinyin: "shuō", english: "speak, say", category: "Verb" },
  { chinese: "一点儿", pinyin: "yìdiǎnr", english: "a little", category: "Quantifier" },
];

export function applyCombinedVocabCorrections(
  level: 1 | 2,
  words: CombinedVocabRow[]
): CombinedVocabRow[] {
  if (level !== 1) return words;

  const corrected = words.map((word) => HSK1_REPLACEMENTS[word.chinese] ?? word);
  return [...corrected, ...HSK1_ADDITIONS];
}
