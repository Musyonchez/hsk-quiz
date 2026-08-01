import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractCombinedVocab, type CombinedVocabRow } from "./pdf-vocab-table";
import { applyCombinedVocabCorrections } from "./combined-vocab-corrections";
import { ALL_HSK_LEVELS, type HskLevel } from "@/lib/hsk-level";

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
  level: HskLevel;
  words: CombinedVocabRow[];
}

export async function extractCombinedLevel(level: HskLevel): Promise<CombinedLevelData> {
  const pdfPath = path.join(combinedVocabDir, `HSK ${level} Vocabulary list.pdf`);
  const words = applyCombinedVocabCorrections(level, await extractCombinedVocab(pdfPath));
  return { level, words };
}

export async function extractAllCombinedLevels(): Promise<CombinedLevelData[]> {
  return Promise.all(ALL_HSK_LEVELS.map((level) => extractCombinedLevel(level)));
}
