import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractCombinedVocab, type CombinedVocabRow } from "./pdf-vocab-table";
import { applyCombinedVocabCorrections } from "./combined-vocab-corrections";
import { HSK4A_COMBINED_WORDS } from "./hsk4a-combined-data";
import { HSK4B_COMBINED_WORDS } from "./hsk4b-combined-data";
import { ALL_LEVELS, type LevelSlug } from "@/lib/hsk-level";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// website/src/lib/extract -> repo root (chinese/), four levels up.
const repoRoot = path.resolve(__dirname, "../../../..");
const combinedVocabDir = path.join(
  repoRoot,
  "raw",
  "HSK-All-Levels-Vocabulary",
  "HSK All Levels Vocabulary"
);

export interface CombinedLevelData {
  slug: LevelSlug;
  words: CombinedVocabRow[];
}

// Levels 1-3 are single-volume and still sourced from the cumulative
// third-party PDF, corrected against the official textbook appendix (see
// combined-vocab-corrections.ts). HSK4A (and future 4B/5A/5B/6A/6B) are
// split-book levels sourced directly from that book's own transcribed
// appendix instead — no PDF, no corrections needed.
async function extractPdfBackedLevel(slug: "1" | "2" | "3"): Promise<CombinedLevelData> {
  const pdfPath = path.join(combinedVocabDir, `HSK ${slug} Vocabulary list.pdf`);
  const words = applyCombinedVocabCorrections(Number(slug) as 1 | 2 | 3, await extractCombinedVocab(pdfPath));
  return { slug, words };
}

export async function extractCombinedLevel(slug: LevelSlug): Promise<CombinedLevelData> {
  if (slug === "1" || slug === "2" || slug === "3") {
    return extractPdfBackedLevel(slug);
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
