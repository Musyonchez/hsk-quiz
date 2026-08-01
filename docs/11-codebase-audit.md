# Codebase Audit (post-HSK4-pause)

A file-by-file pass over all of `website/src` and `prisma/` after the HSK4+ pause
(see [07-roadmap.md](07-roadmap.md)), looking for redundancy, gaps, errors, and
best-practice drift accumulated while iterating quickly. Findings are split into
what got fixed immediately (low-risk, clear-cut) and what's flagged for later
(behavioral judgment calls or bigger changes).

## Fixed

- **Dead re-export removed**: `queries.ts` exported `isLevelSlugParam` as an
  alias of `hsk-level.ts`'s `isLevelSlug` — nobody imported it; every page
  imports `isLevelSlug` directly. Deleted.
- **Stale, duplicated landing copy**: "Type the pinyin for HSK 1 and HSK 2
  vocabulary, by chapter or the full level." was hand-copied verbatim into
  `layout.tsx`'s metadata description, `login/page.tsx`, `register/page.tsx`,
  and `dashboard/page.tsx` — inaccurate since HSK3 shipped, and needed editing
  in 4 places every time a level count changed. Reworded to "Type the pinyin
  for HSK vocabulary, by chapter or the full level." (level-count-agnostic) in
  all four. `README.md`'s "HSK 1/2 vocabulary" line was the same staleness;
  updated to "HSK 1-3".
- **Registration race condition**: `POST /api/auth/register` only checked
  `prisma.user.findUnique` for an existing username before `create`-ing — two
  concurrent requests for the same username could both pass that check and
  the loser would hit an unhandled unique-constraint violation (500 instead
  of a clean 409). Now wraps the `create` in try/catch for Prisma error code
  `P2002` and returns the same "already taken" 409 either way.
- **Level display-name gap**: `hsk/[level]/combined/page.tsx`,
  `.../combined/quiz/page.tsx`, and the chapter learn page's breadcrumb all
  rendered `HSK {levelSlug}` using the raw URL slug instead of the `Level`
  row's `name` field. Invisible today only because slug happens to equal the
  number for HSK1-3 (`"1"` → "HSK 1") — would have rendered as "HSK 4a"
  instead of "HSK 4A" the moment HSK4+ goes live. Added `getLevelName(slug)`
  to `queries.ts` and included `level: { select: { name: true } }` in
  `getChapterWithWords`; all three spots now show the real `name`.
- **Triplicated vocab-preview table**: the landing page (`app/page.tsx`)
  hand-rolled its own Chinese/Pinyin/English `<table>` — identical markup to
  the one already built into `VocabTable.tsx`. Exported that internal
  renderer as `VocabTableGroup` and reused it on the landing page instead of
  a third copy of the same JSX. (`QuizRunner.tsx` has a fourth, genuinely
  different table — see "not fixed" below for why that one was left alone.)
- **Five near-identical adapter files consolidated**: `extract-hsk3-chapters.ts`,
  `extract-hsk4a-chapters.ts`, `extract-hsk4b-chapters.ts`,
  `extract-hsk5a-chapters.ts`, and `extract-hsk5b-chapters.ts` each did
  nothing but map an in-repo chapter-data array into `ChapterData[]`,
  stamping a hardcoded level slug and a `"Lesson N"` title. Replaced all five
  with one shared `extractInRepoChapters(slug, chapters)` helper in the new
  `in-repo-chapters.ts`; `extract-chapters.ts` now calls it directly for
  HSK3. Reactivating HSK4A/4B/5A/5B later needs one import + one
  array-spread line each, not a whole adapter file per level.
- Verified after every change: `tsc --noEmit`, `eslint`, `next build`, and a
  full reseed all clean, with identical per-chapter word counts before and
  after the adapter consolidation (no behavioral change, pure dedup).

## Noted, not fixed (judgment calls / deferred)

- **`Attempt` is read but never written.** The dashboard calls
  `getMostRecentAttempt()` and has UI for "Last played: ...", and the
  `Attempt`/`Friendship` models + their indexes exist in `schema.prisma`, but
  nothing anywhere ever creates an `Attempt` row — `QuizRunner` finishes a
  quiz entirely client-side and never calls an API to record the result. The
  dashboard's "Last played" line will therefore never render. This matches
  the documented roadmap (attempts/leaderboard/friends are a later phase,
  per [07-roadmap.md](07-roadmap.md)), but is worth flagging explicitly since
  the read-side already exists and looks functional while being silently
  dead until `POST /api/attempts` is built.
- **`GET /api/auth/me` has no caller.** Server Components call
  `getSessionUser()` directly, so nothing in the app fetches this route. It's
  documented as intentional public API surface in
  [05-architecture.md](05-architecture.md)'s API table, so left in place, but
  it's currently unexercised code.
- **`QuizRunner`'s table vs. `VocabTable`'s table.** Both render a
  Chinese/Pinyin/English table, but `QuizRunner`'s masks the pinyin column
  until answered and highlights the current/correct row — genuinely
  different behavior, not just different styling. Deliberately *not* merged
  with `VocabTableGroup`; forcing a shared component here would add
  conditional complexity for two call sites that will keep diverging.
- **Magic-number coupling in `QuizRunner`.** Its sticky toolbar uses
  `top-18.25` (an arbitrary Tailwind value) to sit just below `AppHeader`.
  That number is implicitly derived from `AppHeader`'s height/padding with no
  compile-time link between the two files — if `AppHeader`'s height ever
  changes, this will silently misalign. Not fixed (would need a shared CSS
  variable or measured value); flagged so a future `AppHeader` change knows
  to check it.
- **`better-sqlite3` / `@prisma/adapter-better-sqlite3` are in `dependencies`,
  not `devDependencies`**, even though [05-architecture.md](05-architecture.md)
  documents SQLite as dev/test-only with Postgres in prod. Not moved since
  the prod swap-over doc already exists and this is a one-line fix at that
  time — flagged so whoever wires up `@prisma/adapter-pg` remembers to move
  these out (or knowingly accepts the extra bundle weight).
- **Combined-word seeding is O(words) round-trips, not a single upsert.**
  `Word` has no DB-level uniqueness that covers combined rows (its only
  compound unique key, `[chapterId, chinese]`, doesn't help since every
  combined word shares `chapterId: null`). `seed.ts` works around this with
  a manual find-then-create/update loop instead of `prisma.word.upsert`,
  correctly commented at the call site. Not restructured — a real fix would
  need a nullable-aware partial unique index, which SQLite/Prisma don't
  support cleanly — but noted since it's the main reason a full reseed takes
  noticeably longer than the row count would suggest.
- **`combined-vocab-corrections.ts`'s three `HSKn_REPLACEMENTS`/`_ADDITIONS`
  pairs** are structurally identical patterns repeated per level with an
  if/else dispatch. Left alone deliberately: this is per-level *data* (each
  level's actual corrections differ), not duplicated logic, so abstracting
  it would just add indirection without removing any real repetition.

## Context for future sessions

- The HSK4A/4B/5A/5B data files (`hsk4a-combined-data.ts`,
  `hsk4a-chapters-data.ts`, and the 4b/5a/5b equivalents) are intentionally
  unreferenced right now — see [07-roadmap.md](07-roadmap.md)'s "HSK4+
  paused" entry. They're not "redundant" in the sense flagged above; they're
  parked, complete work waiting for `ALL_LEVELS` (`hsk-level.ts`) to grow
  again.
- `docs/07-roadmap.md`'s older entries still reference the now-deleted
  `extract-hsk3-chapters.ts` / `extract-hsk4a-chapters.ts` filenames by name —
  that's expected and untouched: it's a dated changelog of what was true at
  the time, not living documentation, so it isn't rewritten when later
  refactors (like this one) change those files' names.
