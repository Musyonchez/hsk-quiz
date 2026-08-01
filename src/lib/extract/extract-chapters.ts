import { extractInRepoChapters } from "./in-repo-chapters";
import { HSK1_CHAPTERS } from "./hsk1-chapters-data";
import { HSK2_CHAPTERS } from "./hsk2-chapters-data";
import { HSK3_CHAPTERS } from "./hsk3-chapters-data";
import type { LevelSlug } from "@/lib/hsk-level";

export interface ChapterWordRow {
  chinese: string;
  pinyin: string;
  wordType: string | null;
  meaning: string | null;
}

export interface ChapterData {
  level: LevelSlug;
  chapterNumber: number;
  title: string;
  words: ChapterWordRow[];
}

// All levels' chapter word lists live entirely inside website/ as in-repo
// data files (hsk1-chapters-data.ts and friends), not external markdown or
// PDFs, so this repo is self-contained on its own.
//
// HSK4A/4B/5A/5B are fully transcribed the same way but deliberately not
// included here — see the comment on ALL_LEVELS in hsk-level.ts for why.
// Re-add them once HSK4+ goes live on the site again: import their data file
// and add `...extractInRepoChapters("4a", HSK4A_CHAPTERS)` etc. below, plus
// the slug to ALL_LEVELS.
export async function extractAllChapters(): Promise<ChapterData[]> {
  return [
    ...extractInRepoChapters("1", HSK1_CHAPTERS),
    ...extractInRepoChapters("2", HSK2_CHAPTERS),
    ...extractInRepoChapters("3", HSK3_CHAPTERS),
  ];
}
