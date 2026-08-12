// Shared across QuizRunner/ChoiceQuizRunner/MatchQuizRunner — one canonical
// shape for the word data every quiz runner variant renders, instead of
// each component re-declaring an identical type.
export type QuizWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
  // Optional ahead of docs/39's mnemonic dictionary wiring — the schema
  // column, the per-level dictionaries (src/quiz/mnemonics/), and the
  // backfill script have landed, but no queries.ts call site selects/maps
  // Word.mnemonic into a QuizWord yet, so this is still always undefined at
  // runtime today. Declared now, per docs/38, so Character mode's popup can
  // render a conditional mnemonic line without a second migration once a
  // call site starts populating it; every existing QuizWord literal
  // (queries.ts, seed data) stays valid untouched since the field is
  // optional.
  mnemonic?: string | null;
};
