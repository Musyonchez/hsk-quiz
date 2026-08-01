import type { ChapterData } from "./extract-chapters";
import { HSK4B_CHAPTERS } from "./hsk4b-chapters-data";

// HSK4B has no characters/words/hsk4b/chapterN/vocabulary.md files — its
// chapter word lists live entirely in hsk4b-chapters-data.ts instead, the
// same way HSK3's and HSK4A's do.
export function extractHsk4bChapters(): ChapterData[] {
  return HSK4B_CHAPTERS.map((chapter) => ({
    level: "4b" as const,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
