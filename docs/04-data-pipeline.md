# Data Pipeline (seeding the database)

Goal: turn source files (markdown + PDF, both already in this repo) into rows in the database
described in [05-architecture.md](05-architecture.md). This is a **one-off/rerunnable seed
step**, not something the server parses live on each request — PDF/markdown parsing has no
business running on every page load, and the frontend never sees these files at all, only the
database (via the API).

## Where extraction logic lives vs. where it's used

- `website/src/lib/extract/extract-combined.ts` and `.../extract-chapters.ts` — pure
  functions: read source files, return plain JS objects (`{ chinese, pinyin, ... }[]`). No
  database code in here, so they're independently testable against fixture files, and they're
  reusable from Server Components too if a page ever needs on-demand parsing.
- `website/prisma/seed.ts` — calls those extraction functions and writes the results via the
  Prisma client into `Level` / `Chapter` / `Word` / `GrammarPattern` rows. This is the only
  place that talks to the database during seeding.

## `extract-combined.ts`

Reads the two PDFs in `raw/HSK-All-Levels-Vocabulary/HSK All Levels Vocabulary/`, parses the
`Chinese | Pinyin | English` rows and category header rows (`Personal Pron.`, `Numeral`,
`Noun`, ...), returns one flat array per level: `{ chinese, pinyin, english, category }[]`.
Rows without an English gloss (auxiliary particles like 的/了/吗/呢) are kept — the quiz only
needs `chinese`/`pinyin`.

PDF parsing library: needs a Node PDF-to-text/table library (e.g. `pdf-parse` or
`pdfjs-dist`) — decide at implementation time based on how cleanly it preserves the 3-column
table layout; may need coordinate-based text extraction rather than naive text-stream reading
since the source is a styled table, not plain text.

## `extract-chapters.ts`

Walks `characters/words/hsk{1,2}/chapter*/vocabulary.md`, applies the rules in
[03-content-extraction-rules.md](03-content-extraction-rules.md), returns per chapter:
`{ level, chapterNumber, title, words: [...], grammarPatterns: [...] }`. Also reads the
matching `grammer.md` when present (HSK 2) to pull the selective grammar-pattern items
described in Rule 2 there.

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
keys): `Level` → `Chapter` → `Word` (chapter-sourced) → `Word` (combined-sourced, `chapterId`
null) → `GrammarPattern`. Upsert keyed on `(levelId, chapterNumber)` / `(chapterId, chinese)`
so re-running the seed after a source file edit updates existing rows instead of duplicating
them.

## When it runs

- `npm run db:seed`, manually, against whichever database `DATABASE_URL`/the Prisma
  `schema.prisma` currently points at (SQLite in dev, Postgres in prod).
- Re-run whenever a `vocabulary.md`/`grammer.md` is edited (e.g. after a pinyin backfill pass)
  or a new chapter is completed, and once against prod after a content update ships.
- Never runs automatically inside a request handler — kept strictly out of the API server's
  runtime path.
