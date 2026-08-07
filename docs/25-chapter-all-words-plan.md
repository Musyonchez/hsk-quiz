# Chapter "All Words" (Dialog Vocabulary) Plan

Written before any implementation, same discipline as [17](17-custom-chapter-quiz-plan.md)/
[18](18-quiz-runner-and-picker-improvements-plan.md)/[19](19-meaning-quiz-mode-plan.md)/
[24](24-responsive-design-plan.md).

## Context

Every chapter's textbook dialog uses more vocabulary than the chapter's official "New Words"
list — the New Words list is curated (only the words the textbook is explicitly teaching that
lesson), but the surrounding dialog also contains supporting words a learner needs to actually
read the conversation. Today the app only ever shows New Words; there's no way to see or quiz on
the fuller dialog vocabulary. The user wants that added, without changing New Words' existing
behavior or precedence — New Words stays "paramount," this is purely additive.

## What "All Words" means here

A **complete, independently-ordered vocabulary list for one chapter's dialog(s)**, in the order
each word first appears in the book — not a merge/union of New Words with something else, and
not deduplicated against New Words. A word that's both a New Word and appears in the dialog shows
up in both places (as it does in the physical textbook itself); trying to stitch New Words and
"extra" words into one interleaved reading-order list would need its own explicit ordering field
on every existing New Word row too, for no real benefit — treating "All Words" as its own
self-contained list, built directly from the pasted dialog text, is simpler and matches "list the
words like new words" (i.e., All Words is displayed exactly like New Words is today, just backed
by different data).

## Decisions

- **New `Word.source` value: `"dialog"`.** Same shape as existing rows (`chapterId` set,
  `wordType` optional), just a third source alongside `"chapter"`/`"combined"`. Ordered by `id`
  ascending at insert time — same convention `"chapter"` rows already rely on for textbook order
  (`getChapterWithWords`'s `orderBy: { id: "asc" }`) — so the seed data file's array order *is*
  the reading order; no separate position field needed.
- **Unique constraint gains `source`**: `@@unique([chapterId, chinese])` →
  `@@unique([chapterId, chinese, source])`. Required because a word can now legitimately have two
  rows for the same `chapterId` (one `"chapter"`, one `"dialog"`) when it's both a New Word and
  appears in the dialog.
- **Not merged into Custom Quiz.** `getWordsForChapters`/`getCombinedWords` (custom-quiz's word
  source) only ever query `source: "chapter"` / `source: "combined"` — `"dialog"` rows are simply
  never touched by those queries, so no extra exclusion code is needed; confirmed by re-reading
  both functions in `queries.ts`.
- **All Words gets its own quiz modes** (Type pinyin / Match meaning), reusing `QuizModeGate`
  exactly like New Words does today — same runners, same no-reveal-until-finished guarantees,
  nothing new to build there. Distinct `quizKey`s (`quizKeyFor` gains a `wordSet?: "all"` option)
  so these attempts never mix with New Words' leaderboard rows:
  - Type: `hsk{level}-chapter{n}-all`
  - Match: `hsk{level}-chapter{n}-all-match`
  - `QUIZ_KEY_PATTERN`/`parseQuizKey`/`describeQuizKey` extended to recognize the `-all` segment.
    `/leaderboard/[quizKey]` needs no other change — it's already generic over any valid
    `quizKey` string (confirmed by reading it), so All Words attempts get a working leaderboard
    page for free once the key format is recognized.
  - The **leaderboard picker page** (`/leaderboard?level=`) is *not* getting a third tab in this
    pass — its Type/Match tabs stay as they are. All Words leaderboards stay reachable via each
    result screen's own "View leaderboard" link (same as every other quiz key already works,
    just not separately browsable yet). Small, deliberately deferred scope cut — flag if you want
    it added later.
  - **No Play Next / Play Another chaining** for All Words quizzes (`nextQuiz={null}`,
    `anotherQuiz` omitted). New Words' chaining logic (`getQuizNavigation`) assumes "next chapter
    of New Words, then combined" — there's no equivalent well-defined sequence for a partially-
    populated set of All Words chapters yet. Can be revisited once most/all chapters have dialog
    data.
- **Three tabs, not two buttons** — `AppHeader`... no, specifically a new small shared component
  (`AllWordsTabs.tsx`) rendering **Dialog / Type pinyin / Match meaning** as active-state pill
  tabs (visually matching the existing `tabClasses` pattern already used on the leaderboard
  picker and leaderboard results pages — reused, not reinvented). "Dialog" is the reference list
  itself (`/hsk/[level]/chapter/[chapter]/all`, the default/active tab when you're on that page);
  the other two tabs link out to `/hsk/[level]/chapter/[chapter]/all/quiz?mode=type` and
  `?mode=meaning`. Both pages render the same tab bar so the active tab is always visible
  regardless of which of the three you're on.
- **The "All Words" card only appears once a chapter actually has dialog data.** Rollout is
  incremental — 50 chapters across HSK1–3 — so most chapters will have zero `"dialog"` rows for a
  while. `getChapterDialogWordCount` gates the card on the chapter Learn page (only rendered when
  count > 0) so there are never dead links pointing at an empty list. The `/all` and `/all/quiz`
  routes themselves 404 if hit directly with zero dialog words, same `notFound()` pattern
  `ChapterQuizPage` already uses for an empty chapter.
- **Extraction is manual, word-by-word, chapter-by-chapter** — no NLP segmenter is wired into
  this app (see [04-data-pipeline.md](04-data-pipeline.md)'s existing PDF/data pipeline, which is
  also hand-curated, not auto-extracted). Workflow: you paste one chapter's dialog text in chat, I
  segment it into distinct words in appearance order, look up pinyin + an English gloss for each
  (cross-checking against that chapter's existing New Words for any word that's also a New Word,
  so the gloss style stays consistent), and append the result to a new per-level data file. Each
  distinct word appears once, at its first occurrence — not once per repetition in the dialog.

## File-by-file changes

- **`prisma/schema.prisma`**: `Word.source` comment updated to `"chapter" | "combined" |
  "dialog"`; `@@unique([chapterId, chinese])` → `@@unique([chapterId, chinese, source])`. New
  migration required (`prisma migrate dev`) — a real schema change against the shared Neon
  database, so this runs once confirmed, not speculatively.
- **`src/lib/extract/hsk{1,2,3}-chapter-dialog-data.ts`** (new, one per level, empty/sparse
  arrays to start): same shape as the existing `hsk{1,2,3}-chapters-data.ts` files — an array of
  `{ chapterNumber, words: [{ chinese, pinyin, wordType?, meaning }] }` — populated incrementally
  as dialogs are pasted in.
- **`src/lib/extract/extract-dialog.ts`** (new): dispatches by level slug to the right data file
  above, mirroring `extract-chapters.ts`'s existing dispatch pattern exactly.
- **`prisma/seed.ts`**: new seeding step alongside the existing chapter/combined ones — upserts
  `source: "dialog"` rows from `extract-dialog.ts`, keyed on `[chapterId, chinese, source]` (the
  new composite unique constraint) so it stays idempotent like every other seed step.
- **`src/lib/queries.ts`**: `getChapterDialogWords(levelSlug, chapterNumber)` (returns the ordered
  word list) and `getChapterDialogWordCount(levelSlug, chapterNumber)` (for the Learn page's card
  gate — cheap count query, same pattern as `getCombinedWordCount`).
- **`src/quiz/quiz-key.ts`**: `quizKeyFor` gains `wordSet?: "new" | "all"` (default `"new"`,
  producing today's exact key shape unchanged); `QUIZ_KEY_PATTERN` and `parseQuizKey` recognize
  the new `-all` segment; `describeQuizKey` renders e.g. "HSK 1 — Chapter 5 (all words)".
- **`src/components/AllWordsTabs.tsx`** (new): the three-tab bar described above, `active`
  prop (`"dialog" | "type" | "meaning"`), takes the chapter's base `/all` href and builds the two
  quiz-mode hrefs from it.
- **`src/app/hsk/[level]/chapter/[chapter]/all/page.tsx`** (new): the "Dialog" reference tab —
  `requireSession`, fetch dialog words + chapter title, render `AllWordsTabs` (active="dialog")
  then a plain `VocabTable` (unlabeled table, same as New Words renders today).
- **`src/app/hsk/[level]/chapter/[chapter]/all/quiz/page.tsx`** (new): mirrors
  `chapter/[chapter]/quiz/page.tsx` almost exactly — `QuizModeGate` with the `-all` quiz keys,
  `meaningVariant="match"`, `allowDrillMissed`, dialog words instead of chapter words, no
  `nextQuiz`/`anotherQuiz`, `AllWordsTabs` rendered above `QuizModeGate` (active="type" or
  "meaning" based on `?mode=`).
- **`src/app/hsk/[level]/chapter/[chapter]/page.tsx`**: add a `<h2>New Words</h2>` heading above
  the existing `VocabTable` (label only — layout/order unchanged, New Words still renders exactly
  where it does today). Above that, a `QuizLinkCard` to `.../all` — same visual treatment as the
  level hub's "Combined" card — rendered only when `getChapterDialogWordCount(...) > 0`.

## What only the user can do

Paste each chapter's dialog text, one (or a few) at a time, in chat — I can't source textbook
dialog content myself. No fixed order required; chapters go live independently as their data
lands, so this can happen gradually rather than all 50 at once.

## Verification

- `npx prisma migrate dev` succeeds against the shared Neon database, producing the
  `source`-aware unique constraint with no data loss (existing `"chapter"`/`"combined"` rows are
  untouched — the migration only widens a unique index).
- Seed re-run stays idempotent for existing content (re-running with zero dialog data yet
  populated changes nothing).
- Once the first chapter's dialog data lands: Learn page shows the "All Words" card only for that
  chapter, not others; `/all` lists every dialog word in reading order; `/all/quiz?mode=type` and
  `?mode=meaning` run correctly with their own leaderboard-tracked attempts, distinct from that
  chapter's New Words attempts; a chapter with zero dialog rows still 404s cleanly if `/all` is
  hit directly.
- `tsc --noEmit` / `eslint` clean, `npm run build` clean, as always.

## Addendum: real dialog transcripts, not just extracted vocabulary

After the vocabulary version of this feature shipped and was populated from `hold.txt` for all 50
chapters, the user asked for a further step: `hold.txt` doesn't just contain vocabulary — it
contains the actual textbook dialog transcripts (speaker, Chinese, pinyin, English, per line,
grouped into "Dialog 1/2/3..." scenes) that the vocabulary was originally extracted *from*. That
content is worth surfacing directly, not just mined for words and discarded.

**Tab restructure**: the "Dialog" tab (previously the All Words vocabulary table, mislabeled)
becomes the real conversation transcript; the vocabulary table moves to a new, explicitly-named
"All Words" tab. Four tabs total: **Dialog** (transcript) / **All Words** (vocabulary list) /
**Type pinyin** / **Match meaning**.

**New data model**: a `DialogLine` table (`chapterId`, `dialogNumber` + optional scene `label`,
`order` for full-chapter reading order, `speaker`, `chinese`, `pinyin`, `english`) — genuinely
different shape from `Word` (full sentences with a speaker and an English translation, not a
single vocabulary entry), so a new model rather than overloading `Word` again.

**Routes**: `/hsk/[level]/chapter/[chapter]/all` becomes the transcript page; the vocabulary list
moves to `/hsk/[level]/chapter/[chapter]/all/words`; `/all/quiz` unchanged. Same incremental-
rollout gating as the vocabulary version — the Learn page's card and the transcript page itself
only appear once a chapter actually has `DialogLine` rows.

**Source**: re-parsed from the same `hold.txt` already used for the vocabulary extraction — the
dialog lines and their pinyin/English translations were sitting right there in the same source,
just not captured by the first pass (which only needed the Chinese text to segment against).
