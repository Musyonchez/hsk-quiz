// Shared across QuizRunner/ChoiceQuizRunner/MatchQuizRunner — one canonical
// shape for the word data every quiz runner variant renders, instead of
// each component re-declaring an identical type.
export type QuizWord = {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string | null;
};
