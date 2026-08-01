import { readFile, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllTables } from "./markdown-table";
import { extractHsk3Chapters } from "./extract-hsk3-chapters";
import { extractHsk4aChapters } from "./extract-hsk4a-chapters";
import { extractHsk4bChapters } from "./extract-hsk4b-chapters";
import { ALL_LEVELS, type LevelSlug } from "@/lib/hsk-level";

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
  level: LevelSlug;
  chapterNumber: number;
  title: string;
  words: ChapterWordRow[];
}

const DIALOGUE_HEADING = "## 课文 Text — Dialogues";
const GRAMMAR_HEADING = "## 注释 Grammar Notes";
const VOCAB_HEADING = "## 词汇 Vocabulary — New Words";

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
// empty (e.g. 为什么 in hsk2/chapter1) — treated the same as no type at all.
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

async function extractOneChapter(
  level: LevelSlug,
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

  const seen = new Set<string>();
  const words: ChapterWordRow[] = [];
  for (const row of vocabRows) {
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

export async function extractChaptersForLevel(level: LevelSlug): Promise<ChapterData[]> {
  const levelDir = path.join(wordsRoot, `hsk${level}`);
  // Not every level has a characters/words/hsk{N}/ folder yet (HSK4-6 don't
  // exist at all yet, and HSK3's is an empty .keep placeholder) — treat a
  // missing directory as "no markdown chapters for this level" rather than
  // letting readdir's ENOENT crash the whole seed run.
  let entries: Dirent[];
  try {
    entries = await readdir(levelDir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

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
  const fromMarkdown = await Promise.all(
    ALL_LEVELS.map((level) => extractChaptersForLevel(level.slug))
  );
  // HSK3, HSK4A, and HSK4B have no vocabulary.md files — their chapters come
  // from in-repo data instead (extract-hsk3-chapters.ts,
  // extract-hsk4a-chapters.ts, extract-hsk4b-chapters.ts). Their
  // markdown-based entries above will always be [] until/if that changes.
  // HSK5/6 have neither a markdown folder nor in-repo chapter data yet, so
  // they simply contribute no chapters for now.
  return [
    ...fromMarkdown.flat(),
    ...extractHsk3Chapters(),
    ...extractHsk4aChapters(),
    ...extractHsk4bChapters(),
  ];
}
