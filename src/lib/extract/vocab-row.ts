// Shared shape for a level's combined (full-level) word list, regardless of
// which in-repo data file it comes from (hsk1-combined-data.ts and friends).
export interface CombinedVocabRow {
  chinese: string;
  pinyin: string;
  english: string | null;
  category: string | null;
}
