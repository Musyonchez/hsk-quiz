import type { CombinedVocabRow } from "./pdf-vocab-table";

// Corrections found by diffing our combined-word extraction (sourced from
// raw/HSK-All-Levels-Vocabulary, a third-party digmandarin.com word list)
// against the official "生词 New Words" appendix in the HSK Standard Course
// textbooks themselves (raw/hsk1/HSK 1 standard course.pdf pages 120-127,
// raw/hsk2/HSK 2 standard course.pdf pages 128-135), transcribed page-by-page
// via an LLM since the raw scanned PDFs have no text layer for direct
// extraction or reliable OCR. See the git log around this file for both
// transcriptions this was checked against.
//
// Each level's combined list is a fully independent, cumulative word list
// (HSK2's ~300 words include a second copy of all of HSK1's ~150), sourced
// from that level's own PDF — so a bug in HSK1's PDF (e.g. 饭馆/没) isn't
// automatically fixed by correcting HSK1's list; it has to be corrected in
// HSK2's copy too, since it's parsed independently. `一点儿` note: our
// existing category naming for count-word (num.-m.) entries has a source
// typo, "Numberal" instead of "Numeral", for plain numbers (一/二/三 etc) —
// deliberately left as-is here for consistency with the rest of the seeded
// data rather than fixed in isolation.
//
// Two kinds of fix:
// - `replace`: the source PDF paired the right pinyin with the wrong
//   character (e.g. pinyin "fàndiàn" attached to 饭馆 instead of 饭店 — the
//   character that actually matches both the pinyin and the official
//   syllabus), or used a different-but-related word than the one actually
//   taught (号 vs 日 in HSK1; 男人/女人 vs 男/女, 玩 vs 玩儿 in HSK2).
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

// HSK2's own PDF repeats the 饭馆/没 mistakes from its cumulative copy of the
// HSK1 word list, but does NOT repeat the 日/号 one — 日 is a genuine,
// separate HSK2-taught word (lesson 15) distinct from HSK1's 号, so it's
// correct as-is here and must not be replaced the way it is for level 1.
const HSK2_REPLACEMENTS: Record<string, CombinedVocabRow> = {
  饭馆: { chinese: "饭店", pinyin: "fàndiàn", english: "hotel, restaurant", category: "Noun" },
  没: { chinese: "没有", pinyin: "méiyǒu", english: "there is not", category: "Adverb" },
  男人: { chinese: "男", pinyin: "nán", english: "man, male", category: "Adjective" },
  女人: { chinese: "女", pinyin: "nǚ", english: "woman, female", category: "Adjective" },
  玩: { chinese: "玩儿", pinyin: "wánr", english: "to play, to have fun", category: "Verb" },
};

const HSK2_ADDITIONS: CombinedVocabRow[] = [
  // Carried over from the same gaps in HSK1's PDF (see HSK1_ADDITIONS) —
  // still official HSK2-syllabus words since the list is cumulative.
  { chinese: "说", pinyin: "shuō", english: "speak, say", category: "Verb" },
  { chinese: "一点儿", pinyin: "yìdiǎnr", english: "a little", category: "Quantifier" },
  // Genuinely new-to-HSK2 words missing from the source PDF.
  { chinese: "比", pinyin: "bǐ", english: "than", category: "Preposition" },
  { chinese: "宾馆", pinyin: "bīnguǎn", english: "hotel", category: "Noun" },
  { chinese: "公司", pinyin: "gōngsī", english: "company, firm", category: "Noun" },
  { chinese: "面条", pinyin: "miàntiáo", english: "noodles", category: "Noun" },
  { chinese: "铅笔", pinyin: "qiānbǐ", english: "pencil", category: "Noun" },
  { chinese: "虽然", pinyin: "suīrán", english: "although, though", category: "Conjunction" },
  { chinese: "往", pinyin: "wǎng", english: "to, towards", category: "Preposition" },
  {
    chinese: "一下",
    pinyin: "yíxià",
    english: "used after a verb, indicating a brief attempt",
    category: "Quantifier",
  },
];

export function applyCombinedVocabCorrections(
  level: 1 | 2,
  words: CombinedVocabRow[]
): CombinedVocabRow[] {
  if (level === 1) {
    const corrected = words.map((word) => HSK1_REPLACEMENTS[word.chinese] ?? word);
    return [...corrected, ...HSK1_ADDITIONS];
  }

  const corrected = words.map((word) => HSK2_REPLACEMENTS[word.chinese] ?? word);
  return [...corrected, ...HSK2_ADDITIONS];
}
