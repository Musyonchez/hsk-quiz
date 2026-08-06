import type { ChapterWordRow } from "./extract-chapters";

// HSK1 chapters' full dialog vocabulary — docs/25-chapter-all-words-plan.md.
// Independent from HSK1_CHAPTERS (hsk1-chapters-data.ts): this is every
// distinct word that appears in a chapter's textbook dialog, in the order it
// first appears, not deduplicated against that chapter's New Words. Starts
// empty; filled in incrementally, chapter by chapter, as dialog text is
// supplied.

export interface Hsk1ChapterDialogData {
  chapterNumber: number;
  words: ChapterWordRow[];
}

export const HSK1_CHAPTER_DIALOGS: Hsk1ChapterDialogData[] = [];
