import type { ChapterData } from "./extract-chapters";
import { HSK5B_CHAPTERS } from "./hsk5b-chapters-data";

// HSK5B has no characters/words/hsk5b/chapterN/vocabulary.md files — its
// chapter word lists live entirely in hsk5b-chapters-data.ts instead, the
// same way HSK5A's do.
export function extractHsk5bChapters(): ChapterData[] {
  return HSK5B_CHAPTERS.map((chapter) => ({
    level: "5b" as const,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
