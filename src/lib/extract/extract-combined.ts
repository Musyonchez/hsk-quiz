import type { CombinedVocabRow } from "./vocab-row";
import { HSK1_COMBINED_WORDS } from "./hsk1-combined-data";
import { HSK2_COMBINED_WORDS } from "./hsk2-combined-data";
import { HSK3_COMBINED_WORDS } from "./hsk3-combined-data";
import { HSK4A_COMBINED_WORDS } from "./hsk4a-combined-data";
import { HSK4B_COMBINED_WORDS } from "./hsk4b-combined-data";
import { ALL_LEVELS, type LevelSlug } from "@/lib/hsk-level";

export interface CombinedLevelData {
  slug: LevelSlug;
  words: CombinedVocabRow[];
}

// Every level's combined (full-level) word list lives entirely inside
// website/ as an in-repo data file, so this repo is self-contained on its
// own. Levels 1-3 used to be parsed at build/seed time from a third-party
// PDF in the main chinese/ repo's raw/ folder, corrected against the
// official textbook appendix — that one-time extraction has already been
// run and its output baked into hsk1/2/3-combined-data.ts (see the comment
// atop hsk1-combined-data.ts), the same way HSK4A/4B were always sourced
// directly from their own transcribed appendix.
export async function extractCombinedLevel(slug: LevelSlug): Promise<CombinedLevelData> {
  if (slug === "1") {
    return { slug, words: HSK1_COMBINED_WORDS };
  }
  if (slug === "2") {
    return { slug, words: HSK2_COMBINED_WORDS };
  }
  if (slug === "3") {
    return { slug, words: HSK3_COMBINED_WORDS };
  }
  if (slug === "4a") {
    return { slug, words: HSK4A_COMBINED_WORDS };
  }
  if (slug === "4b") {
    return { slug, words: HSK4B_COMBINED_WORDS };
  }
  throw new Error(`No combined-word source wired up yet for level slug "${slug}"`);
}

export async function extractAllCombinedLevels(): Promise<CombinedLevelData[]> {
  return Promise.all(ALL_LEVELS.map((level) => extractCombinedLevel(level.slug)));
}
