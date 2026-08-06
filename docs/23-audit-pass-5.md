# Audit Pass 5

A full read-only pass over the whole app as it stands today — every file under `src/`,
`prisma/`, top-level config (`next.config.ts`, `package.json`, `tsconfig.json`,
`eslint.config.mjs`, `prisma.config.ts`), and the docs describing current architecture/deploy —
picking up where [22-audit-pass-4.md](22-audit-pass-4.md) left off. All three bugs and both
doc-drift items from pass 4 are confirmed **fixed** in the working tree (see "Pass 4 follow-up"
below); this pass looks for what's changed or been missed since. `tsc --noEmit` and `eslint .`
both run clean throughout. All findings below have since been fixed — see each item's "Fixed"
note.

## Bugs / functional gaps

- **A failed friend-request response leaves its row's buttons permanently disabled.**
  `FriendRequestRow.respond()` (`src/components/FriendRequestRow.tsx`) sets `submitting` to the
  action, `await fetch(...)`, then unconditionally calls `router.refresh()` — no `res.ok` check,
  no `.catch`, and nothing that resets `submitting` on failure. If the POST 403s (e.g. the request
  was already resolved from another tab, or by the other side ignoring it) or the fetch itself
  throws (offline, a blip), `submitting` never clears: both "Accept"/"Ignore" buttons on that row
  stay disabled for the rest of the page's life, with no visible error telling the player why. A
  full reload is the only recovery. `AddFriendForm` (same file's sibling component) does this
  correctly — checks `res.ok`, shows `data?.error`, and always clears `submitting` — so the fix is
  bringing this component in line with that existing pattern, not inventing a new one.
  **Fixed**: `respond()` now wraps the `fetch` in `try`/`catch` (network failure clears
  `submitting` and shows a generic error), checks `res.ok` on success (clears `submitting`, shows
  `data?.error` inline, same as `AddFriendForm`), and only calls `router.refresh()` on an actual
  200. Verified against a real 400 (`{"error":"Request already resolved."}`, produced by
  resolving a pending request server-side out from under an already-loaded page, then clicking
  Accept on the now-stale row): the inline error appeared and both buttons re-enabled once the
  response resolved, instead of staying stuck disabled.

## Minor / worth-noting (not urgent)

- **`LoginFailure` rows are never cleaned up for a username that's never retried.**
  `recordLoginFailure` (`src/lib/login-rate-limit.ts`) prunes only *that* username's own expired
  rows, as a side effect of that username failing again; `isLoginLocked` never deletes anything,
  just counts. A username that fails once and is never tried again — a legitimate typo, or an
  attacker spraying distinct throwaway usernames — leaves its row in the table forever. This isn't
  a behavioral regression from the old in-memory `Map` (same unbounded-keys shape), but it *is* a
  durability change: the Map got wiped for free on every server restart / cold serverless start,
  and the Postgres table doesn't. Harmless at this app's current scale (a personal site, a handful
  of users), but worth a follow-up (a periodic `DELETE WHERE createdAt < now() - 15m`, or just
  accepting slow, bounded-by-attacker-effort growth) before it's a concern.
  **Not fixed, left as-is** (matches the audit's own "not urgent" call): tried adding an
  opportunistic prune to `isLoginLocked` too, but it doesn't actually help the case this item
  describes — `isLoginLocked` is called with the *same* username as `recordLoginFailure`, so a
  username that's genuinely never retried at all never calls either function again either way;
  there's no second call site to piggyback cleanup on without a real periodic job. Reverted that
  change. A scheduled `DELETE WHERE createdAt < now() - 15m` (e.g. a Vercel cron hitting a small
  route) would be the actual fix, worth doing once this app has enough traffic for the table's
  unbounded growth to matter.

## Doc drift (stale, contradicted by the actual Postgres-only setup)

- **`docs/05-architecture.md` still describes the pre-Neon-migration world in several places**,
  none of which were touched by the Postgres/Vercel migration docs (20-22) since those are newer,
  separate files and 05 was never revisited:
  - "Dev/testing: SQLite — a single file (`website/dev.db`)... **Prod**: an external Postgres
    instance" — per [20](20-postgres-vercel-migration-plan.md)'s "What actually happened" and
    [21](21-vercel-deploy.md), dev and prod now share the *same* Neon Postgres database; there is
    no SQLite anywhere anymore.
  - The driver-adapter paragraph still frames `@prisma/adapter-better-sqlite3` →
    `@prisma/adapter-pg` as a still-pending swap to "budget for... when standing up prod" — that
    swap already happened, and to `@prisma/adapter-neon` (not `adapter-pg`), per
    [20](20-postgres-vercel-migration-plan.md)'s Decisions section.
  - The **API surface table** lists `GET /api/levels`, `GET /api/levels/:n/chapters`,
    `GET /api/levels/:n/chapters/:c/words`, `GET /api/levels/:n/combined`, and
    `GET /api/attempts/recent` — none of these routes exist in `src/app/api/`. Vocabulary pages
    read straight from `lib/queries.ts` in Server Components; there's no public vocab REST API and
    never has been in the current codebase. (The other rows in that table — auth, attempts,
    leaderboard, friends — are all accurate.)
  - "Local dev flow" step 1/2 still say migrations apply "to `dev.db`" and seeding writes "into
    the (SQLite) database" — both Postgres now.
  - The folder-layout listing still shows `dev.db  # sqlite file, git-ignored` as if it's live
    config; it's an inert leftover file today (see below), not something the app reads.
  - The same folder-layout listing's `api/` tree includes the same phantom `levels/*` routes as
    the table above, and is missing real routes/pages that exist today (`custom-quiz/**`,
    `hsk/[level]/custom/**`, `leaderboard/page.tsx`'s level-picker, `friends/requests/**`).
  
  None of this affects runtime behavior — it's a planning doc, not code — but it actively
  misdescribes the current architecture to anyone (human or agent) reading it cold, which is
  exactly the failure mode this doc exists to prevent. Worth a dedicated pass to bring it current
  rather than folding into this one, since it touches most of the doc's sections.
  **Fixed**: the DB paragraph, driver-adapter paragraph, "why a real backend" section, auth
  section, folder layout, API surface table, and local dev flow all rewritten to match the
  current shared-Neon-Postgres, no-vocab-API reality — phantom `levels/*` and `attempts/recent`
  routes removed from both the table and the folder tree, real routes/pages
  (`custom-quiz/**`, `hsk/[level]/custom/**`, `leaderboard/page.tsx`, `login-rate-limit.ts`,
  `queries.ts`) added in, `dev.db` folder-tree line removed.
- **`README.md`'s "Getting started"/"Stack" sections have the same SQLite-in-dev staleness** —
  "apply Prisma migrations to `dev.db` (SQLite)" and "Prisma 7 + SQLite in dev (Postgres in
  prod...)" are both inaccurate for the same reason as above: dev now points at the shared Neon
  database via `DATABASE_URL`, same as prod.
  **Fixed**: both sections reworded to describe the shared Postgres database, plus a note that
  `DATABASE_URL` is required.

## Housekeeping

- **`dev.db` (212KB) still sits at the repo root**, a leftover from before the Postgres migration.
  It's git-ignored (`/dev.db` in `.gitignore`) and nothing in `src/lib/db.ts` reads it anymore
  (`PrismaNeon` only), so it's inert — but it's easy to mistake for live config given
  `docs/05-architecture.md` still lists it as such (see above). Safe to delete locally; not
  tracked, so this is a one-machine cleanup, not a commit.
  **Fixed**: deleted locally (confirmed git-ignored via `git check-ignore` first).

## Pass 4 follow-up — confirmed fixed

All three bugs and two of the three doc-drift items from
[22-audit-pass-4.md](22-audit-pass-4.md) are fixed in the current working tree (not yet
committed at the time of this pass):

- **Login lockout**: `login-rate-limit.ts` now backed by the new `LoginFailure` Postgres table
  instead of an in-memory `Map`; `isLoginLocked`/`recordLoginFailure`/`clearLoginFailures` are all
  `async` now and correctly `await`ed from `POST /api/auth/login`. Verified the count/prune logic
  is correct (see the one minor follow-up above) and the route awaits every call.
- **Leaderboard picker missing meaning-mode links**: `src/app/leaderboard/page.tsx` now has
  Type/Match tabs that carry `?mode=` through to `quizKeyFor`, reaching both leaderboards.
- **Play Next/Play Another dropping quiz mode**: `QuizModeGate` now appends `?mode=` to both
  targets via a local `withMode` helper before handing them to whichever runner is active.
  Confirmed safe for every current caller — `getQuizNavigation`'s hrefs never carry an existing
  `?`, so the plain string-append doesn't clobber or duplicate a query string anywhere today.
- **`next.config.ts`'s stale SQLite `serverExternalPackages`**: removed.
- **`queries.ts`'s outdated "SQLite/Prisma can't" comment**: reworded to correctly say Postgres
  *could* do this via `DISTINCT ON`, just not through Prisma's query builder.
- **`docs/20`'s Decisions section claiming `render.yaml` was kept**: rewritten to describe the
  actual reversal (deleted once Vercel became the committed target), matching what really
  happened and what `docs/16-deploy.md` already says about itself.

## Not flagged (checked, found fine)

- Every API route (`auth/*`, `attempts/*`, `friends/*`, `leaderboard`) re-checked for
  session/ownership enforcement — all correct, including the two friend-request action routes'
  "only the receiver may accept/ignore, only if still pending" checks.
- `ChoiceQuizRunner`/`MatchQuizRunner`/`QuizRunner`'s no-reveal-before-`finished` guarantee holds
  in all three variants; the shared `pill-classes.ts`/toolbar styling is consistent across all
  three.
- `CustomQuizPicker`'s href-building (`buildQuizHref`) and the corresponding parsers
  (`src/app/custom-quiz/quiz/page.tsx`'s `parseSelections`,
  `src/app/hsk/[level]/custom/quiz/page.tsx`'s `parseChapterNumbers`) round-trip correctly for
  every combination the picker UI can actually produce (single-level combined, single-level 2+
  chapters, cross-level mixes) — including the "at least 2 chapters, or 2+ levels" minimum-usable
  rule enforced identically in both the client-side picker and the server-side page.
- `seed.ts`'s upsert/stale-row-cleanup logic for both combined and chapter words, re-verified
  against the current schema — matching key (chinese+pinyin for combined, chapterId+chinese for
  chapter) is still correct and still the reason a plain `prisma.word.upsert` isn't used for
  combined rows.
- `prisma/schema.prisma`'s new `LoginFailure` model — correctly indexed
  (`[username, createdAt]`) for exactly the query `isLoginLocked` runs; no FK needed since it's
  keyed on the lowercased username string, not a `User` row (so it still records failures against
  usernames that don't exist, which is the point).
- `next.config.ts`'s security headers, `tsconfig.json`, `eslint.config.mjs`, `prisma.config.ts` —
  all consistent with the app's actual current shape, no drift found.
- `npx tsc --noEmit` and `npx eslint .` both clean with zero errors/warnings at the time of this
  pass.
