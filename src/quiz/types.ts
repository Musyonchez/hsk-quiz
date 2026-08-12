// Shared across QuizRunner/ChoiceQuizRunner/MatchQuizRunner — one canonical
// shape for the word data every quiz runner variant renders, instead of
// each component re-declaring an identical type.
export type QuizWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
  // docs/39's mnemonic dictionary — schema column, per-level dictionaries
  // (src/quiz/mnemonics/), and backfill are all live, and this flows
  // through today: queries.ts's word-fetching functions never `select`-
  // narrow Word, so Prisma returns the full row (mnemonic included) and it
  // rides straight through as a QuizWord's `.mnemonic` with no extra
  // mapping needed. Verified live — CharacterBrowse's popup renders it.
  // Optional only because some QuizWord literals (older seed/test data
  // shapes, if any) may not carry it; every real DB-backed call site does.
  mnemonic?: string | null;
};
