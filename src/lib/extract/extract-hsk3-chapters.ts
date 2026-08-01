import type { ChapterData } from "./extract-chapters";
import { HSK3_CHAPTERS } from "./hsk3-chapters-data";

// HSK3 has no characters/words/hsk3/chapterN/vocabulary.md files yet (that
// folder is still just a .keep placeholder) — its chapter word lists live
// entirely in hsk3-chapters-data.ts instead, per explicit instruction not to
// add new content under characters/words/. This function exists so
// extract-chapters.ts's extractAllChapters() can treat HSK3 the same as
// HSK1/2 from the seeding side, despite the different underlying source.
export function extractHsk3Chapters(): ChapterData[] {
  return HSK3_CHAPTERS.map((chapter) => ({
    level: "3" as const,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
