# Data Pipeline (seeding the database)

Goal: turn the in-repo vocabulary data files into rows in the database described in
[05-architecture.md](05-architecture.md). This is a **one-off/rerunnable seed step**, not
something the server parses live on each request — the frontend never sees these files at all,
only the database (via the API).

Every level's word list — chapter-scoped and combined — lives entirely inside this repo as
plain TypeScript data (`src/lib/extract/hsk{N}-chapters-data.ts` and
`hsk{N}-combined-data.ts`). There is no PDF or markdown parsing at seed time anymore, and no
path outside the repo is ever read — it's self-contained. (✅ docs/50 full-sweep audit §20: this
used to say "website/" — that was the app's folder name back when it lived nested inside a larger
monorepo; it's the repo root now, so the `website/` prefix below is dropped.) See
[02-data-sources.md](02-data-sources.md) for where each level's data originally came from
before being baked into these files.

## Where extraction logic lives vs. where it's used

- `src/lib/extract/extract-combined.ts` and `.../extract-chapters.ts` — pure functions
  that pick the right in-repo data file per level slug and return plain JS objects
  (`{ chinese, pinyin, ... }[]`). No database code in here.
- `prisma/seed.ts` — calls those extraction functions and writes the results via the
  Prisma client into `Level` / `Chapter` / `Word` / `GrammarPattern` rows. This is the only
  place that talks to the database during seeding.

Pages only ever read from the database, never from `lib/extract/` — that boundary is kept even
though extraction is no longer I/O-bound, so a Server Component can't accidentally end up
depending on the data-file layout.

## `extract-combined.ts`

Dispatches on level slug to the matching `HSK{N}_COMBINED_WORDS` constant
(`hsk1-combined-data.ts` through `hsk4b-combined-data.ts`), each a flat
`{ chinese, pinyin, english, category }[]`. Rows without an English gloss (auxiliary particles
like 的/了/吗/呢) are kept — the quiz only needs `chinese`/`pinyin`.

HSK1-3's data files are the one-time output of parsing a third-party PDF and applying
hand-verified corrections against the official textbook appendix; HSK4A/4B's were always
transcribed directly from their own book's appendix. Once baked into the `*-data.ts` files, both
sources are handled identically — there's no longer a code-level distinction between them.

## `extract-chapters.ts`

Dispatches to the matching `HSK{N}_CHAPTERS` constant (`hsk1-chapters-data.ts` through
`hsk5b-chapters-data.ts` when wired in), each a flat array of
`{ chapterNumber, title?, words: [...] }`, fed through the shared `extractInRepoChapters()`
adapter (`in-repo-chapters.ts`) into the common `ChapterData` shape
(`{ level, chapterNumber, title, words }`) that `seed.ts` consumes. A chapter without an
explicit `title` falls back to `"Lesson N"`.

**`GrammarPattern` is not extracted at all**, despite being modeled in the schema — this was a
deliberate call, not an oversight: which grammar notes are "HSK-exam relevant" is a judgment
call that was never made consistently enough across levels to automate. See
[07-roadmap.md](07-roadmap.md).

## `seed.ts`

Orchestrates both extractors and upserts into the database in this order (respecting foreign
keys): `Level` → `Word` (combined-sourced, `chapterId` null) → `Chapter` → `Word`
(chapter-sourced). `Chapter` is upserted on `(levelId, number)`; chapter-sourced `Word` on
`(chapterId, chinese)`. Combined-sourced words have no such compound unique key available (every
combined word shares `chapterId: null`, so a naive `(levelId, chinese, pinyin)` key can't be
declared as a real DB constraint) — `seedCombinedLevels` works around this with an explicit
find-then-create/update per word instead of a single `upsert` call. Either way, re-running the
seed after a data-file edit updates existing rows instead of duplicating them, and also deletes
rows a previous run created that the current data no longer produces (e.g. a word corrected in
one of the `*-data.ts` files, or a whole category dropped).

## When it runs

- `npm run db:seed`, manually, against whichever database `DATABASE_URL` currently points at —
  in practice the single shared Neon Postgres database dev and prod both use, there's no SQLite
  involved at any point (see [05-architecture.md](05-architecture.md)).
- Re-run whenever a `hsk{N}-chapters-data.ts` / `hsk{N}-combined-data.ts` file is edited, or a
  new chapter/correction is added, and once against prod after a content update ships.
- Never runs automatically inside a request handler — kept strictly out of the API server's
  runtime path.
