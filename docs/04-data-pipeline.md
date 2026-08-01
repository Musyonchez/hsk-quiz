# Data Pipeline (seeding the database)

Goal: turn source files (markdown + PDF, both already in this repo) into rows in the database
described in [05-architecture.md](05-architecture.md). This is a **one-off/rerunnable seed
step**, not something the server parses live on each request — PDF/markdown parsing has no
business running on every page load, and the frontend never sees these files at all, only the
database (via the API).

## Where extraction logic lives vs. where it's used

- `website/src/lib/extract/extract-combined.ts` and `.../extract-chapters.ts` — pure
  functions: read source files, return plain JS objects (`{ chinese, pinyin, ... }[]`). No
  database code in here, so they're independently testable against fixture files.
- `website/prisma/seed.ts` — calls those extraction functions and writes the results via the
  Prisma client into `Level` / `Chapter` / `Word` / `GrammarPattern` rows. This is the only
  place that talks to the database during seeding.

**Not importable from the Next.js app itself.** `extract-combined.ts` resolves the PDF/markdown
paths relative to its own source file location (`import.meta.url`) so it can find `raw/` from
wherever it's invoked. That only works when run directly by `tsx` (i.e. `prisma/seed.ts`) —
if a Server Component ever imported it, Next's bundler would relocate the compiled file into
`.next/`, and the relative path to `raw/` would resolve to nothing. Keep the seed step and the
app strictly separated: pages only ever read from the database, never from `lib/extract/`.

## `extract-combined.ts`

For HSK1-3: reads that level's PDF in `raw/HSK-All-Levels-Vocabulary/HSK All Levels
Vocabulary/` via `pdf-vocab-table.ts` (built on `pdfjs-dist`, using coordinate-based text
extraction since the source is a styled table, not plain text/markdown), parses the `Chinese |
Pinyin | English` rows and category header rows (`Personal Pron.`, `Numeral`, `Noun`, ...),
then applies that level's hand-verified corrections from `combined-vocab-corrections.ts`
(fixing PDF transcription bugs and adding words the PDF was missing, diffed against the
official textbook appendix — see that file's own comments for the full rationale per level).
Returns one flat array per level: `{ chinese, pinyin, english, category }[]`. Rows without an
English gloss (auxiliary particles like 的/了/吗/呢) are kept — the quiz only needs
`chinese`/`pinyin`.

HSK4A/4B (and HSK5A/5B/6A/6B whenever they're wired back in — see
[07-roadmap.md](07-roadmap.md)) don't go through this PDF pipeline at all: each HSK4-6 book is
sourced directly from its own transcribed textbook appendix in an in-repo data file
(`hsk4a-combined-data.ts` and friends), since they're published as two separate volumes that
the cumulative all-levels PDF doesn't match. `extract-combined.ts` dispatches on level slug to
pick the right path.

## `extract-chapters.ts`

For HSK1/HSK2: walks `characters/words/hsk{1,2}/chapter*/vocabulary.md`, applies the rules in
[03-content-extraction-rules.md](03-content-extraction-rules.md), returns per chapter:
`{ level, chapterNumber, title, words: [...] }`.

For HSK3 (and HSK4A/4B/5A/5B whenever wired back in): no `vocabulary.md` exists at all — chapter
word lists live in an in-repo TypeScript data file instead (`hsk3-chapters-data.ts` and
friends), fed through the shared `extractInRepoChapters()` adapter into the same `ChapterData`
shape the markdown parser produces, so `seed.ts` can't tell the two sources apart. See
[02-data-sources.md](02-data-sources.md) for why HSK3+ diverges from the markdown source.

**`GrammarPattern` is not extracted by either path**, despite being modeled in the schema —
this was a deliberate call, not an oversight: which grammar notes are "HSK-exam relevant" is a
judgment call, and the source chapters' grammar-notes headings aren't consistent enough
(numbered vs. unnumbered, Chinese- vs. English-first, inline vs. a separate `grammer.md`) to
make that judgment reliably from markdown structure alone. See
[07-roadmap.md](07-roadmap.md).

`title` comes from the file's first line — every sample chapter opens with a level-1 heading
of the form `# Lesson N — 你叫什么名字 (Nǐ jiào shénme míngzi) What's Your Name`. Take that
whole line (minus the leading `# `) as the title verbatim; don't try to split it into
Chinese/pinyin/English sub-fields, since the format isn't perfectly regular between HSK 1 and
HSK 2 chapters and the raw heading text is exactly what the level hub and learn page need to
display anyway (see [09-pages.md](09-pages.md) §2).

Markdown parsing: a markdown table extractor keyed on heading text (`## 词汇 Vocabulary — New
Words`, `## 课文 Text — Dialogues`, `## 注释 Grammar Notes`) — split the file into sections by
`##`/`###` heading boundaries first, then run a table parser only inside the target section(s).
No need for a full markdown AST library; the heading structure is regular enough for a
line-based state machine.

## `seed.ts`

Orchestrates both extractors and upserts into the database in this order (respecting foreign
keys): `Level` → `Word` (combined-sourced, `chapterId` null) → `Chapter` → `Word`
(chapter-sourced). `Chapter` is upserted on `(levelId, number)`; chapter-sourced `Word` on
`(chapterId, chinese)`. Combined-sourced words have no such compound unique key available (every
combined word shares `chapterId: null`, so a naive `(levelId, chinese, pinyin)` key can't be
declared as a real DB constraint) — `seedCombinedLevels` works around this with an explicit
find-then-create/update per word instead of a single `upsert` call. Either way, re-running the
seed after a source file edit updates existing rows instead of duplicating them, and also
deletes rows a previous run created that the current extraction no longer produces (e.g. a word
corrected in `combined-vocab-corrections.ts`, or a whole category — like proper nouns — dropped
from extraction entirely).

## When it runs

- `npm run db:seed`, manually, against whichever database `DATABASE_URL`/the Prisma
  `schema.prisma` currently points at (SQLite in dev, Postgres in prod).
- Re-run whenever a `vocabulary.md`/`grammer.md` is edited (HSK1/HSK2) or an in-repo data file
  like `hsk3-chapters-data.ts` is edited (HSK3+), or a new chapter/correction is added, and once
  against prod after a content update ships.
- Never runs automatically inside a request handler — kept strictly out of the API server's
  runtime path.
