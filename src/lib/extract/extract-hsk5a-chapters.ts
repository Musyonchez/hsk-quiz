import type { ChapterData } from "./extract-chapters";
import { HSK5A_CHAPTERS } from "./hsk5a-chapters-data";

// HSK5A has no characters/words/hsk5a/chapterN/vocabulary.md files — its
// chapter word lists live entirely in hsk5a-chapters-data.ts instead, the
// same way HSK3's/HSK4A's/HSK4B's do.
export function extractHsk5aChapters(): ChapterData[] {
  return HSK5A_CHAPTERS.map((chapter) => ({
    level: "5a" as const,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
