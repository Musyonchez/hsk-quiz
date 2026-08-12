// Shared across QuizRunner/ChoiceQuizRunner/MatchQuizRunner — one canonical
// shape for the word data every quiz runner variant renders, instead of
// each component re-declaring an identical type.
export type QuizWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
  // Optional ahead of docs/34's mnemonic dictionary landing (currently a
  // paused WIP branch, feat/memory-aid-mnemonics) — no call site populates
  // this yet, so it's always undefined today. Declared now, per docs/38, so
  // Character mode's popup can render a conditional mnemonic line without a
  // second migration once the dictionary lands; every existing QuizWord
  // literal (queries.ts, seed data) stays valid untouched since the field is
  // optional.
  mnemonic?: string | null;
};
