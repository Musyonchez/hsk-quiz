import type { ChapterData } from "./extract-chapters";
import { HSK4A_CHAPTERS } from "./hsk4a-chapters-data";

// HSK4A has no characters/words/hsk4a/chapterN/vocabulary.md files — its
// chapter word lists live entirely in hsk4a-chapters-data.ts instead, the
// same way HSK3's do (see extract-hsk3-chapters.ts), per instruction not to
// add new content under characters/words/.
export function extractHsk4aChapters(): ChapterData[] {
  return HSK4A_CHAPTERS.map((chapter) => ({
    level: "4a" as const,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
