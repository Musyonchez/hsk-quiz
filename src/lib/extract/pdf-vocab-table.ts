import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface CombinedVocabRow {
  chinese: string;
  pinyin: string;
  english: string | null;
  category: string | null;
}

interface Cell {
  x: number;
  text: string;
}

/**
 * Parses a "Chinese | Pinyin | English" HSK vocabulary-list PDF (the
 * digmandarin.com format used in raw/HSK-All-Levels-Vocabulary/) into rows.
 *
 * The PDF has no real table structure — every cell is a positioned text run.
 * Rows are recovered by grouping text items by y-coordinate, and columns are
 * recovered by x-coordinate: the header row ("Chinese"/"Pinyin"/"English")
 * gives us the Chinese column's x position, which single-cell category rows
 * (e.g. "Personal Pron.") also align to — anything else with one cell (page
 * numbers, the title) does not, and is dropped.
 */
export async function extractCombinedVocab(
  pdfPath: string
): Promise<CombinedVocabRow[]> {
  const data = new Uint8Array(await readFile(pdfPath));
  const doc = await getDocument({ data }).promise;

  const rows: CombinedVocabRow[] = [];
  let chineseColumnX: number | null = null;
  // Some levels' PDFs (HSK 3) have no single-cell category header rows at
  // all, unlike HSK 1/2's "Personal Pron." style headers — category stays
  // null throughout for those rather than an empty string.
  let currentCategory: string | null = null;
  let started = false;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const byY = new Map<number, Cell[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const text = item.str.trim();
      if (!text) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x, text });
    }

    const sortedY = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const cells = byY.get(y)!.sort((a, b) => a.x - b.x);

      if (!started) {
        // Header text isn't perfectly consistent across levels — HSK 3's PDF
        // has a "Pinying" typo (extra "g") instead of "Pinyin" — so match on
        // prefix rather than an exact string.
        if (
          cells.length === 3 &&
          cells[0].text === "Chinese" &&
          cells[1].text.startsWith("Piny")
        ) {
          chineseColumnX = cells[0].x;
          started = true;
        }
        continue;
      }

      if (cells.length === 1) {
        // A category header row aligns with the Chinese column; anything
        // else this sparse (page number, stray title text) is noise.
        if (chineseColumnX !== null && Math.abs(cells[0].x - chineseColumnX) < 5) {
          currentCategory = cells[0].text;
        }
        continue;
      }

      const [chineseCell, pinyinCell, ...rest] = cells;
      rows.push({
        chinese: chineseCell.text,
        pinyin: pinyinCell.text,
        english: rest.length > 0 ? rest.map((c) => c.text).join(" ") : null,
        category: currentCategory,
      });
    }
  }

  return rows;
}
