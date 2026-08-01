import type { CombinedVocabRow } from "./pdf-vocab-table";
import type { HskLevel } from "@/lib/hsk-level";

// Corrections found by diffing our combined-word extraction (sourced from
// raw/HSK-All-Levels-Vocabulary, a third-party digmandarin.com word list)
// against the official "生词 New Words" appendix in the HSK Standard Course
// textbooks themselves (raw/hsk1/HSK 1 standard course.pdf pages 120-127,
// raw/hsk2/HSK 2 standard course.pdf pages 128-135, HSK Standard Course 3
// pages 178-190), transcribed page-by-page via an LLM since the raw scanned
// PDFs have no text layer for direct extraction or reliable OCR. See the git
// log around this file for each transcription this was checked against.
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

// HSK3's PDF has no category-header rows at all (see pdf-vocab-table.ts),
// and doesn't repeat the earlier levels' 饭馆/没/男人/女人/玩 mistakes — those
// four words simply don't reappear as mistakes a third time in this PDF.
// One new formatting bug here instead: the source PDF baked a parenthetical
// part-of-speech annotation directly into the Chinese-column text itself
// ("花 （动）" instead of "花"), rather than a separate column — this also
// conveniently merges 花's two senses (flower / to spend) that the PDF
// otherwise splits into a bare verb row and a missing noun row, so folding
// both into one row's meaning avoids needing a second same-pinyin row that
// chinese+pinyin-keyed upsert matching (see prisma/seed.ts) can't
// distinguish from the first.
const HSK3_REPLACEMENTS: Record<string, CombinedVocabRow> = {
  "花 （动）": { chinese: "花", pinyin: "huā", english: "flower; to spend", category: null },
};

const HSK3_ADDITIONS: CombinedVocabRow[] = [
  { chinese: "词典", pinyin: "cídiǎn", english: "dictionary", category: "Noun" },
  { chinese: "笔记本（电脑）", pinyin: "bǐjìběn (diànnǎo)", english: "notebook, laptop", category: "Noun" },
  { chinese: "感兴趣", pinyin: "gǎn xìngqù", english: "to be interested in", category: null },
  { chinese: "个子", pinyin: "gèzi", english: "height, stature", category: "Noun" },
  { chinese: "后来", pinyin: "hòulái", english: "later, afterwards", category: "Noun" },
  { chinese: "聊天（儿）", pinyin: "liáotiān(r)", english: "to chat", category: "Verb" },
  { chinese: "留学", pinyin: "liú xué", english: "to study abroad", category: "Verb" },
  { chinese: "皮鞋", pinyin: "píxié", english: "leather shoes", category: "Noun" },
  { chinese: "瓶子", pinyin: "píngzi", english: "bottle", category: "Noun" },
  { chinese: "起飞", pinyin: "qǐfēi", english: "(of an aircraft) to take off", category: "Verb" },
  { chinese: "起来", pinyin: "qǐlai", english: "(indicating an upward movement) to rise", category: "Verb" },
  { chinese: "请假", pinyin: "qǐng jià", english: "to ask for leave", category: "Verb" },
  { chinese: "试", pinyin: "shì", english: "to try", category: "Verb" },
  { chinese: "信用卡", pinyin: "xìnyòngkǎ", english: "credit card", category: "Noun" },
  { chinese: "饮料", pinyin: "yǐnliào", english: "drink, beverage", category: "Noun" },
  { chinese: "嘴", pinyin: "zuǐ", english: "mouth", category: "Noun" },
  { chinese: "最后", pinyin: "zuìhòu", english: "the last one", category: "Noun" },
  // A second reading of an already-present character, not a replacement —
  // 只 (zhǐ, "only") already exists; this is 只 (zhī, a measure word for
  // certain animals), distinguished from the first by pinyin.
  { chinese: "只", pinyin: "zhī", english: "used for certain animals", category: "Quantifier" },
  // "不但……而且……" and "只有……才……" (both in the official appendix) are
  // paired grammar-pattern skeletons, not standalone typable vocabulary —
  // deliberately excluded here the same way "太……了" was excluded from
  // HSK1/2, consistent with 06-quiz-mechanics.md's separate "grammar
  // pattern" quiz-item concept (not yet built) rather than combined vocab.
];

export function applyCombinedVocabCorrections(
  level: HskLevel,
  words: CombinedVocabRow[]
): CombinedVocabRow[] {
  if (level === 1) {
    const corrected = words.map((word) => HSK1_REPLACEMENTS[word.chinese] ?? word);
    return [...corrected, ...HSK1_ADDITIONS];
  }

  if (level === 2) {
    const corrected = words.map((word) => HSK2_REPLACEMENTS[word.chinese] ?? word);
    return [...corrected, ...HSK2_ADDITIONS];
  }

  if (level === 3) {
    const corrected = words.map((word) => HSK3_REPLACEMENTS[word.chinese] ?? word);
    return [...corrected, ...HSK3_ADDITIONS];
  }

  // HSK4/5/6: no official-textbook diff done yet (no transcription supplied
  // yet, unlike 1/2/3 — see the git log for that process). Raw PDF
  // extraction only, until corrections are supplied the same way.
  return words;
}
