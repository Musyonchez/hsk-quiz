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

// Only levels with actual seed data belong here — 4b/5a/5b/6a/6b are added
// one at a time as their textbook appendix/chapter data is transcribed.
export const ALL_LEVELS: readonly LevelDefinition[] = [
  { slug: "1", number: 1, part: null, name: "HSK 1" },
  { slug: "2", number: 2, part: null, name: "HSK 2" },
  { slug: "3", number: 3, part: null, name: "HSK 3" },
  { slug: "4a", number: 4, part: "A", name: "HSK 4A" },
  { slug: "4b", number: 4, part: "B", name: "HSK 4B" },
  { slug: "5a", number: 5, part: "A", name: "HSK 5A" },
  { slug: "5b", number: 5, part: "B", name: "HSK 5B" },
];

export function isLevelSlug(value: string): value is LevelSlug {
  return ALL_LEVELS.some((level) => level.slug === value);
}

export function getLevelDefinition(slug: LevelSlug): LevelDefinition {
  const def = ALL_LEVELS.find((level) => level.slug === slug);
  if (!def) throw new Error(`Unknown level slug: ${slug}`);
  return def;
}
