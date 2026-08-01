import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllTables } from "./markdown-table";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// website/src/lib/extract -> repo root (chinese/), four levels up.
const repoRoot = path.resolve(__dirname, "../../../..");
const wordsRoot = path.join(repoRoot, "characters", "words");

export interface ChapterWordRow {
  chinese: string;
  pinyin: string;
  wordType: string | null;
  meaning: string | null;
}

export interface ChapterData {
  level: 1 | 2;
  chapterNumber: number;
  title: string;
  words: ChapterWordRow[];
}

const DIALOGUE_HEADING = "## 课文 Text — Dialogues";
const GRAMMAR_HEADING = "## 注释 Grammar Notes";
const VOCAB_HEADING = "## 词汇 Vocabulary — New Words";

// A standalone bold marker line, e.g. "**Proper Nouns**" or "**Proper nouns:**".
// Deliberately does NOT match the one inline variant seen in hsk2/chapter13
// ("**专有名词 Proper Noun:** 杨笑笑 ... — name of a person") — that line has
// its content on the same line as the marker, not as a following table, and
// is rare enough (1 of 30 chapters) that it's a documented gap rather than a
// special case in the parser. See website/docs/03-content-extraction-rules.md.
const PROPER_NOUNS_MARKER = /^\*\*Proper\s+Nouns?\s*:?\*\*\s*$/i;

/** Lines from just after `startHeading` up to (not including) `endHeading`. */
function sliceBetweenHeadings(
  lines: string[],
  startHeading: string,
  endHeading: string
): string[] {
  const startIdx = lines.findIndex((line) => line.trim() === startHeading);
  if (startIdx === -1) return [];
  const endIdx = lines.findIndex(
    (line, i) => i > startIdx && line.trim() === endHeading
  );
  return lines.slice(startIdx + 1, endIdx === -1 ? lines.length : endIdx);
}

/** Lines from just after `heading` up to the next `## ` heading (or end of input). */
function sliceSection(lines: string[], heading: string): string[] {
  const startIdx = lines.findIndex((line) => line.trim() === heading);
  if (startIdx === -1) return [];
  const endIdx = lines.findIndex(
    (line, i) => i > startIdx && line.trim().startsWith("## ")
  );
  return lines.slice(startIdx + 1, endIdx === -1 ? lines.length : endIdx);
}

// A source Type column is sometimes a bare "—" placeholder rather than left
// empty (e.g. 为什么 in hsk2/chapter1) — treated the same as no type at all,
// consistent with how Proper Noun rows (which have no Type column) store it.
function normalizeWordType(value: string): string | null {
  if (!value || value === "—" || value === "-") return null;
  return value;
}

function parseVocabTableRows(tableRows: string[][]): ChapterWordRow[] {
  // Columns are [#, Character, Pinyin, Type, Meaning]. The "#" column is
  // ignored entirely (including its "*n" supplementary-word marker) — words
  // are addressed by position here, not by that running number.
  return tableRows
    .filter((cells) => cells.length >= 5)
    .map((cells) => ({
      chinese: cells[1],
      pinyin: cells[2],
      wordType: normalizeWordType(cells[3]),
      meaning: cells[4] || null,
    }));
}

function parseProperNounRows(lines: string[]): ChapterWordRow[] {
  const rows: ChapterWordRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!PROPER_NOUNS_MARKER.test(lines[i].trim())) continue;
    const tables = parseAllTables(lines.slice(i + 1, i + 20));
    const table = tables[0];
    if (!table) continue;
    for (const cells of table) {
      // Columns are [Character, Pinyin, Meaning] — no "#" and no "Type".
      if (cells.length < 3) continue;
      rows.push({
        chinese: cells[0],
        pinyin: cells[1],
        wordType: null,
        meaning: cells[2] || null,
      });
    }
  }
  return rows;
}

async function extractOneChapter(
  level: 1 | 2,
  chapterNumber: number,
  filePath: string
): Promise<ChapterData> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  const title = lines[0].replace(/^#\s*/, "").trim();

  const courseSectionLines = sliceBetweenHeadings(
    lines,
    DIALOGUE_HEADING,
    GRAMMAR_HEADING
  );

  const vocabSectionLines = sliceSection(courseSectionLines, VOCAB_HEADING);
  const vocabTables = parseAllTables(vocabSectionLines);
  const vocabRows = vocabTables.flatMap(parseVocabTableRows);

  const properNounRows = parseProperNounRows(courseSectionLines);

  const seen = new Set<string>();
  const words: ChapterWordRow[] = [];
  for (const row of [...vocabRows, ...properNounRows]) {
    if (!row.pinyin) {
      console.warn(
        `[extract-chapters] HSK${level} chapter${chapterNumber}: skipping "${row.chinese}" — missing pinyin`
      );
      continue;
    }
    if (seen.has(row.chinese)) continue;
    seen.add(row.chinese);
    words.push(row);
  }

  return { level, chapterNumber, title, words };
}

export async function extractChaptersForLevel(
  level: 1 | 2
): Promise<ChapterData[]> {
  const levelDir = path.join(wordsRoot, `hsk${level}`);
  const entries = await readdir(levelDir, { withFileTypes: true });

  const chapterDirs = entries
    .filter((e) => e.isDirectory() && /^chapter\d+$/.test(e.name))
    .map((e) => ({
      name: e.name,
      number: Number(e.name.replace("chapter", "")),
    }))
    .sort((a, b) => a.number - b.number);

  const chapters: ChapterData[] = [];
  for (const { name, number } of chapterDirs) {
    const filePath = path.join(levelDir, name, "vocabulary.md");
    chapters.push(await extractOneChapter(level, number, filePath));
  }
  return chapters;
}

export async function extractAllChapters(): Promise<ChapterData[]> {
  const [hsk1, hsk2] = await Promise.all([
    extractChaptersForLevel(1),
    extractChaptersForLevel(2),
  ]);
  return [...hsk1, ...hsk2];
}
