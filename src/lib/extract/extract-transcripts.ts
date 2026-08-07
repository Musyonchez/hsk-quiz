import { HSK1_CHAPTER_TRANSCRIPTS } from "./hsk1-chapter-transcript-data";
import { HSK2_CHAPTER_TRANSCRIPTS } from "./hsk2-chapter-transcript-data";
import { HSK3_CHAPTER_TRANSCRIPTS } from "./hsk3-chapter-transcript-data";
import type { LevelSlug } from "@/lib/hsk-level";

export interface TranscriptLineRow {
  order: number;
  dialogNumber: number;
  dialogLabel: string | null;
  speaker: string;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface TranscriptChapterData {
  level: LevelSlug;
  chapterNumber: number;
  lines: TranscriptLineRow[];
}

// Mirrors extract-dialog.ts's dispatch pattern — docs/25-chapter-all-words
// -plan.md's addendum. HSK4A/4B/5A/5B not included yet, same reasoning as
// extractAllChapters (see hsk-level.ts's ALL_LEVELS comment).
export async function extractAllTranscripts(): Promise<TranscriptChapterData[]> {
  const withLevel = (level: LevelSlug, chapters: readonly { chapterNumber: number; lines: TranscriptLineRow[] }[]) =>
    chapters.map((chapter) => ({ level, chapterNumber: chapter.chapterNumber, lines: chapter.lines }));

  return [
    ...withLevel("1", HSK1_CHAPTER_TRANSCRIPTS),
    ...withLevel("2", HSK2_CHAPTER_TRANSCRIPTS),
    ...withLevel("3", HSK3_CHAPTER_TRANSCRIPTS),
  ];
}
