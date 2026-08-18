// Single source of truth for which HSK levels/books the site knows about, so
// adding a level is a one-line change here instead of a hunt through every
// place a level identifier was previously inlined.
//
// HSK4-6 are each published as two textbook volumes (上/下, "Book A"/"Book
// B"), and are modeled as fully independent Level rows sharing the same
// `number` — the same way HSK1 and HSK2 are independent today — distinguished
// by `slug` (the actual unique DB key) and `part` (display-only). HSK1-3
// remain single-volume, so `part` is null and `slug` is just the number as a
// string.
export type LevelSlug = "1" | "2" | "3" | "4a" | "4b" | "5a" | "5b" | "6a" | "6b";

export interface LevelDefinition {
  slug: LevelSlug;
  number: number;
  part: "A" | "B" | null;
  name: string;
}

// Only levels actually live on the website belong here. HSK4A/4B/5A/5B are
// fully transcribed in this codebase (hsk4a-combined-data.ts and friends)
// but deliberately left out of this list for now — official-textbook
// transcription for the remaining books (5B's appendix, 6A, 6B) is slow to
// do by hand, and the plan is to use a different tool (DeepSeek) to convert
// the raw PDFs before resuming HSK4+ on the site. Re-add a slug here once
// its data is ready to go live; the extraction/seed code for 4a/4b already
// exists and needs no further changes.
export const ALL_LEVELS: readonly LevelDefinition[] = [
  { slug: "1", number: 1, part: null, name: "HSK 1" },
  { slug: "2", number: 2, part: null, name: "HSK 2" },
  { slug: "3", number: 3, part: null, name: "HSK 3" },
];

export function isLevelSlug(value: string): value is LevelSlug {
  return ALL_LEVELS.some((level) => level.slug === value);
}
