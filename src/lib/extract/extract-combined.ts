import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractCombinedVocab, type CombinedVocabRow } from "./pdf-vocab-table";
import { applyCombinedVocabCorrections } from "./combined-vocab-corrections";

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
  level: 1 | 2;
  words: CombinedVocabRow[];
}

export async function extractCombinedLevel(
  level: 1 | 2
): Promise<CombinedLevelData> {
  const pdfPath = path.join(combinedVocabDir, `HSK ${level} Vocabulary list.pdf`);
  const words = applyCombinedVocabCorrections(level, await extractCombinedVocab(pdfPath));
  return { level, words };
}

export async function extractAllCombinedLevels(): Promise<CombinedLevelData[]> {
  return Promise.all([extractCombinedLevel(1), extractCombinedLevel(2)]);
}
