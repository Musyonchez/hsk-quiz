import { HSK1_CHAPTER_DIALOGS } from "./hsk1-chapter-dialog-data";
import { HSK2_CHAPTER_DIALOGS } from "./hsk2-chapter-dialog-data";
import { HSK3_CHAPTER_DIALOGS } from "./hsk3-chapter-dialog-data";
import type { ChapterWordRow } from "./extract-chapters";
import type { LevelSlug } from "@/lib/hsk-level";

export interface DialogChapterData {
  level: LevelSlug;
  chapterNumber: number;
  words: ChapterWordRow[];
}

// Mirrors extract-chapters.ts's dispatch pattern exactly — see
// docs/25-chapter-all-words-plan.md. HSK4A/4B/5A/5B not included yet, same
// reasoning as extractAllChapters (see hsk-level.ts's ALL_LEVELS comment).
export async function extractAllDialogWords(): Promise<DialogChapterData[]> {
  const withLevel = (level: LevelSlug, chapters: readonly { chapterNumber: number; words: ChapterWordRow[] }[]) =>
    chapters.map((chapter) => ({ level, chapterNumber: chapter.chapterNumber, words: chapter.words }));

  return [
    ...withLevel("1", HSK1_CHAPTER_DIALOGS),
    ...withLevel("2", HSK2_CHAPTER_DIALOGS),
    ...withLevel("3", HSK3_CHAPTER_DIALOGS),
  ];
}
