# Phase 6 Plan — Results, Leaderboard, Friends

Written before starting any Phase 6 code, per [07-roadmap.md](../07-roadmap.md)'s Phase 6 line.
`Attempt` and `Friendship` are already in `schema.prisma` (see
[05-architecture.md](../05-architecture.md)) but nothing writes to either yet — `QuizRunner`
finishes a quiz entirely client-side, and the dashboard's `getMostRecentAttempt()` call has
never had a row to find (flagged as dead-but-functional in
[11-codebase-audit.md](11-codebase-audit.md)). This doc fixes the sequencing and nails down the
handful of decisions the architecture doc left as an outline rather than a spec, before writing
any of it.

## Sequencing

Three sub-phases, each shippable and verifiable on its own before the next starts:

1. **Attempt persistence** — `POST /api/attempts`, best-score fetch, dashboard "Last played".
   Everything else in this phase reads `Attempt` rows, so this has to land first.
2. **Leaderboard** — `GET /api/leaderboard`, `/leaderboard/[quizKey]` page. Depends on (1) for
   data to rank.
3. **Friends** — `/friends` page, friend-request routes. Independent of (1)/(2) functionally,
   but ranked last since the friends-scope leaderboard tab needs both an accepted-friends list
   *and* attempt data to be meaningful to look at.

## `quizKey` format (not previously written down concretely)

[05-architecture.md](../05-architecture.md) gives examples (`"hsk1-chapter5"`, `"hsk1-combined"`)
but never states the generation rule. Fixing it now since `Attempt.quizKey` is a bare `String`
column with no foreign key back to `Level`/`Chapter` — the format has to be right the first
time, not migrated later.

- Chapter quiz: `hsk{slug}-chapter{number}` — e.g. `hsk3-chapter5`, `hsk4a-chapter12` (using
  `Level.slug`, not `Level.number`, so HSK4A/4B stay distinguishable whenever they're wired back
  in per [07-roadmap.md](../07-roadmap.md)).
- Combined quiz: `hsk{slug}-combined` — e.g. `hsk3-combined`.
- Built by one helper, `quizKeyFor({ levelSlug, chapterNumber? })` in `src/quiz/` (framework-free,
  alongside `pinyin-match.ts`/`format-time.ts`), used by both `QuizRunner` (to know what key to
  submit) and the results/leaderboard pages (to know what key to fetch). One function so the
  string format is never hand-typed in two places and drifting.

## Sub-phase 1 — Attempt persistence

- **`POST /api/attempts`** — body `{ quizKey, score, total, durationSeconds }`, session required
  (401 if not logged in — `QuizRunner` only calls this after a real finish, so no logged-out
  caller should ever hit it, but the route itself still checks). Validates `quizKey` matches
  `^hsk[a-z0-9]+-(combined|chapter\d+)$` and `0 <= score <= total` before writing, returns 400
  on either failing rather than trusting the client-computed numbers blindly. Creates one
  `Attempt` row per finished quiz — every attempt is kept (not just the best), since the
  leaderboard needs best-per-user and the results page needs "your best," but a future stats
  page (explicitly deferred, [09-pages.md](../09-pages.md)) would want full history too. No upsert:
  this is an append-only log, unlike the vocab tables.
- **`QuizRunner` calls it once, on finish.** Both the "completed" and "gaveup" end states count
  as a finished attempt (a given-up run still has a real score/total worth recording) — a
  `Pause` or a page navigation away mid-quiz does *not* create a row. Fire-and-forget from the
  client (don't block the results screen render on the POST resolving); log a console error on
  failure but don't show the player an error state — a failed write shouldn't feel like a failed
  quiz.
- **`GET /api/attempts/best?quizKey=`** — session required, returns `{ score, total } | null` for
  the current user's best `score/total` ratio on that `quizKey` (highest `score/total`, not
  highest raw `score`, since `total` is constant per `quizKey` anyway — same thing in practice,
  simpler to just order by `score desc` and take the first row). Used by the results page for
  "your best: 91%" per [06-quiz-mechanics.md](../06-quiz-mechanics.md).
- **`getMostRecentAttempt` → dashboard "Last played" gets a real row once (1) ships.** The
  existing query is already correct — it just needs actual data now. One follow-up fix bundled
  in here since it's a one-line change on the same code path: render the `quizKey` as a friendly
  label ("Chapter 5" / "Combined") instead of the bare string, via a small `describeQuizKey()`
  companion to `quizKeyFor()`, resolving the level slug through `getLevelName()` for the level
  part of the label.

## Sub-phase 2 — Leaderboard

- **`GET /api/leaderboard?quizKey=&scope=global|friends`** — session required (even the global
  tab, since "friends" needs a session anyway and one auth rule for the whole route is simpler
  than a mixed public/private endpoint). Ranks by each user's *best* attempt for that
  `quizKey` — one row per user, not one row per attempt (a user who played a quiz 10 times
  shouldn't occupy 10 leaderboard slots). `scope=friends` filters to the requesting user's
  accepted friends plus themself (so "where do I stand among friends" always includes "me," per
  [09-pages.md](../09-pages.md)). Tie-break on `score` equal: earlier `createdAt` first (rewards
  being the one who set the bar, not just matching it later).
- Query approach: since SQLite/Prisma can't cleanly express "best row per user" as a single
  `groupBy` that also returns the winning `createdAt`, fetch all attempts for the `quizKey`
  (scoped to global or the friends set) ordered by `score desc, createdAt asc`, then dedupe to
  first-seen-per-`userId` in application code. Fine at this app's scale (a personal/small-group
  site, not a public leaderboard with thousands of rows per quiz); revisit with a real
  window-function query only if that stops being true.
- `/leaderboard/[quizKey]` page: Global/Friends tabs, `<LeaderboardTable>`, current user's row
  pinned/highlighted per [09-pages.md](../09-pages.md). No `quizKey` given (bare `/leaderboard`) →
  quiz picker (level → chapter/combined), also per that doc.

## Sub-phase 3 — Friends

- **`GET /api/friends`** — accepted friends + pending incoming/outgoing, per the shapes
  [09-pages.md](../09-pages.md)'s Friends page needs.
- **`POST /api/friends/requests`** `{ username }` — looks up the target by username (404 if no
  such user, 400 if the username is the requester's own), then:
  - No existing `Friendship` row either direction → create one, `status: "pending"`.
  - An `ignored` row already exists (either direction) → no-op, per
    [05-architecture.md](../05-architecture.md)'s stated anti-spam rule — return success without a
    new row rather than erroring, so the sender doesn't get a confusing failure for something
    that isn't really their mistake.
  - An `accepted` row already exists → no-op (already friends).
  - A `pending` row already exists in the *same* direction → no-op (don't spam a second request).
  - A `pending` row exists in the *opposite* direction (they already requested you) → treat this
    call as an accept instead of creating a second, redundant row.
- **`POST /api/friends/requests/:id/accept`** / **`.../ignore`** — only the *receiver* of that
  request row may act on it (403 otherwise); flips `status` accordingly.
- `/friends` page per [09-pages.md](../09-pages.md) — friends list, pending (incoming actionable,
  outgoing shown as "waiting"), add-a-friend field.

## Explicitly out of scope for this phase

- Real-time leaderboard updates (polling/websockets) — a fresh fetch on page load/tab switch is
  enough; no live-updating requirement was ever stated.
- Pagination on the leaderboard or friends list — fine at this app's expected scale; revisit if
  that stops being true.
- Everything already listed under [09-pages.md](../09-pages.md)'s "Explicitly not building"
  (history page, settings page, friend search/directory).
