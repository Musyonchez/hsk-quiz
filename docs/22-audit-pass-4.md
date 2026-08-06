# Audit Pass 4

A read-only pass over the whole app post-Vercel-migration — `src/`, `next.config.ts`,
`prisma/`, and the recently-touched docs (`16`, `20`) — looking for correctness bugs, security
gaps, and doc/config drift left over from the last several features (custom quiz, meaning-mode
quiz, Postgres migration). Unlike [12](12-audit-pass-3-bugs.md)/[13](13-audit-pass-3-best-practices.md),
findings here are **not yet fixed** — written up first per direct request, fixes to follow once
reviewed.

## Bugs / functional gaps

- **Login rate-limiting is silently broken on Vercel.** `src/lib/login-rate-limit.ts` tracks
  failed attempts in a plain in-memory `Map`, with its own comment explicitly scoping that to "a
  small, single-instance personal site... revisit with a real store if this ever runs behind more
  than one process." That assumption held on Render (one long-running process) but not on
  Vercel — serverless functions are short-lived and don't share memory reliably across
  invocations, so `isLoginLocked`/`recordLoginFailure` effectively never accumulate real state in
  production. The 5-attempts-per-15-minutes lockout (`src/app/api/auth/login/route.ts`) is
  currently a no-op live; only the timing-safe scrypt comparison and username-enumeration
  protection (`UNREACHABLE_PASSWORD_HASH`) are still doing real work against brute-forcing.
  **Highest-severity finding here** — this is a real, live security gap, not a style issue.
- **The `/leaderboard` picker never links to meaning-mode leaderboards.** Both branches of
  `src/app/leaderboard/page.tsx` build hrefs via `quizKeyFor({ levelSlug, chapterNumber })` with
  no `mode` argument, so every card only ever points at the typing-mode `quizKey`. Meaning-mode
  runs *are* tracked and *do* get their own leaderboard (per
  [19-meaning-quiz-mode-plan.md](19-meaning-quiz-mode-plan.md)'s `-match` suffix) — they're just
  not browsable from here. The only way to reach one today is finishing a meaning-mode quiz and
  clicking "View leaderboard" straight from that run's own results screen.
- **PLAY NEXT / PLAY ANOTHER cards drop the current quiz mode.** `getQuizNavigation`
  (`src/quiz/quiz-navigation.ts`) builds its `href`s with no `?mode=`, so finishing a meaning-mode
  quiz and clicking Play Next/Play Another always lands back on the "pick a quiz mode" picker
  screen instead of continuing in meaning mode — a minor UX inconsistency the mode-picker feature
  ([16](16-deploy.md)'s follow-up work, [22]'s own predecessor session) introduced without
  updating this file to match.

## Stale config / doc drift (harmless today, but wrong)

- **`next.config.ts`'s `serverExternalPackages` still lists the deleted SQLite packages** —
  `["better-sqlite3", "@prisma/adapter-better-sqlite3"]`, both removed from `package.json` during
  the Postgres migration ([20](20-postgres-vercel-migration-plan.md)). A no-op today (Next just
  won't find anything to externalize), but misleading — reads as if the app still depends on
  them.
- **`queries.ts`'s `getLeaderboard` comment says "SQLite/Prisma can't cleanly express... best row
  per user"** — true when written, no longer accurate: the app runs on Postgres now, which *can*
  express this in one query via `DISTINCT ON`. The current application-code dedup still works
  fine at this app's scale (the comment's other stated reasoning), just the "SQLite/Prisma can't"
  framing is outdated.
- **`docs/20`'s "Decisions" section says `render.yaml`/`16-deploy.md` are "left in place, not
  deleted"** — contradicted by the actual, later decision (a follow-up conversation) to delete
  `render.yaml` after all. `docs/20` was never updated to reflect that reversal, so it currently
  documents a decision that isn't what happened — `docs/16-deploy.md`'s own "superseded" framing
  is accurate, `docs/20`'s isn't.

## Not flagged (checked, found fine)

- All API routes checked for auth/ownership checks (`friends/requests/*`, `attempts/*`,
  `leaderboard`) — every mutating/scoped endpoint correctly checks session and, where relevant,
  that the acting user owns/is the target of the row being touched.
- `src/lib/auth.ts` — scrypt with per-password salt, timing-safe comparison, sha256-hashed
  session tokens (never storing the raw token), unreachable-hash technique for username-enum
  resistance on the (broken-lockout-aside) login path itself. No issues.
- `ChoiceQuizRunner`/`MatchQuizRunner` re-checked specifically for the no-reveal-until-finished
  guarantee ([19](19-meaning-quiz-mode-plan.md)) — confirmed no color/class distinguishes
  right/wrong anywhere before `finished`, in both the options bar and the matching board.
- `POST /api/attempts` trusting client-reported `score`/`total` (beyond internal
  `0 <= score <= total` consistency) is pre-existing, documented, in-scope-at-the-time behavior
  (see [14-phase6-plan.md](14-phase6-plan.md)) — not a new finding.
