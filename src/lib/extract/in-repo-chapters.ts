import type { ChapterData, ChapterWordRow } from "./extract-chapters";
import type { LevelSlug } from "@/lib/hsk-level";

export interface InRepoChapterData {
  chapterNumber: number;
  title?: string;
  words: ChapterWordRow[];
}

// Shared by every level whose chapter word lists live entirely in an
// in-repo data file rather than an external markdown source (HSK1-3 today;
// HSK4A/4B/5A/5B when they go live again — see hsk-level.ts). Most sources
// don't supply a descriptive lesson title, so a chapter without one falls
// back to just "Lesson N".
export function extractInRepoChapters(
  slug: LevelSlug,
  chapters: readonly InRepoChapterData[]
): ChapterData[] {
  return chapters.map((chapter) => ({
    level: slug,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title ?? `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
