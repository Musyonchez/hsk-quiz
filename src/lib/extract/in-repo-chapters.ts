import type { ChapterData, ChapterWordRow } from "./extract-chapters";
import type { LevelSlug } from "@/lib/hsk-level";

export interface InRepoChapterData {
  chapterNumber: number;
  words: ChapterWordRow[];
}

// Shared by every level whose chapter word lists live entirely in an
// in-repo data file rather than a characters/words/hsk{N}/.../vocabulary.md
// source (HSK3 today; HSK4A/4B/5A/5B when they go live again — see
// hsk-level.ts). All of them use the same shape (a flat array of
// {chapterNumber, words}) and none of their sources supply a descriptive
// lesson title, so every chapter is titled just "Lesson N".
export function extractInRepoChapters(
  slug: LevelSlug,
  chapters: readonly InRepoChapterData[]
): ChapterData[] {
  return chapters.map((chapter) => ({
    level: slug,
    chapterNumber: chapter.chapterNumber,
    title: `Lesson ${chapter.chapterNumber}`,
    words: chapter.words,
  }));
}
