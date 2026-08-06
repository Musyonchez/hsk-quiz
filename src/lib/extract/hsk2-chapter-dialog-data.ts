import type { ChapterWordRow } from "./extract-chapters";

// HSK2 chapters' full dialog vocabulary — see hsk1-chapter-dialog-data.ts
// for the full explanation (docs/25-chapter-all-words-plan.md). Starts
// empty; filled in incrementally, chapter by chapter.

export interface Hsk2ChapterDialogData {
  chapterNumber: number;
  words: ChapterWordRow[];
}

export const HSK2_CHAPTER_DIALOGS: Hsk2ChapterDialogData[] = [];
