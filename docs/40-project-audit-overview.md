# Project audit: overview and prioritized findings (Aug 2026)

## Why

This app has been built incrementally over ~39 numbered plan docs and never had a dedicated
cleanup pass — the kind of pass that isn't "build the next feature" but "go back and check what
building all those features left behind." Triggered by direct request, after the mobile-menu
Log-out bug (fixed in #19) turned out to be a real, previously-unnoticed bug rather than a
one-off — worth asking "what else is like that."

## How this was done

Five read-only audits ran in parallel over the whole repo, each from a different angle, each
explicitly told to verify findings against real code (grep for callers before calling something
dead, trace actual user flows, don't pad reports with unconfirmed suspicions). No code was changed
during the audit itself — findings only, written up here and in the four companion docs:

- [41-audit-backend-data.md](41-audit-backend-data.md) — schema, migrations, `src/lib/`, API routes
- [42-audit-frontend-components.md](42-audit-frontend-components.md) — components, quiz runners, `src/quiz/`
- [43-audit-docs-consistency.md](43-audit-docs-consistency.md) — every doc cross-checked against actual code
- [44-audit-quiz-ux-gaps.md](44-audit-quiz-ux-gaps.md) — player-facing edge cases, mode inconsistencies, forms
- [45-audit-infra-security.md](45-audit-infra-security.md) — CI, deploy, dependencies, secrets, testing

## The headline finding

**There is no automated test suite.** Zero `*.test.ts`/`*.spec.ts` files, no test runner in
`package.json`, CI runs exactly `tsc --noEmit` + `eslint .`. Every bug this project has ever
caught — including the mobile-menu Log-out bug fixed in #19 — was caught by a human clicking
around, not by anything automated. That bug is a perfect illustration of the gap: it type-checked
cleanly, it lint-checked cleanly, and it was completely broken at runtime. This isn't a "nice to
have" item alongside the others below — it's the reason a full manual audit was worth doing at
all, and it's the reason the next one will be needed too unless this changes.

## Status update (second pass, Aug 2026)

Everything below except items 1, 25, and 20 (partially) was fixed in six follow-up PRs shipped
right after this audit, each individually verified live before merging. A second round of the same
five parallel audits then re-checked every fix against the real code (not just re-read the doc) and
confirmed all of them genuinely landed, with no regressions and no new issues introduced by the new
code (`src/lib/api-rate-limit.ts`, `src/quiz/submit-attempt.ts`, `scripts/confirm-write.ts`, the CSP
header). Items are marked **✅ Fixed** inline below rather than rewritten out of the list, so this
doc still reads as the original inventory. **1** (test suite) was explicitly decided against —
not proportionate to a personal-scale app without multi-contributor churn — rather than deferred.
**25** (`RateLimit` purge) was fixed in a follow-up pass (Vercel Cron). Still open: the
results-screen/`ToolbarButton` half of **20** (the helper-function half — `shuffle`/
`averagePercent` — *was* extracted).

## Prioritized action list (across all five audits)

Ranked by severity first, then by how cheap the fix is — cheap+high-severity first.

### Blocker
1. **Decided against, not deferred** (second pass, Aug 2026) — weighed against actual usage
   (personal-scale, single/small-friends audience, no paying users or SLA) rather than pure
   risk-hygiene, and judged not proportionate to the ongoing cost of writing and maintaining test
   infra. **No automated tests at all** (45 §1). Not something to fully solve in one pass, but even a
   thin slice — a few Playwright smoke tests over the flows that have actually broken before
   (login/logout, one quiz mode start-to-finish, the mobile drawer) — would catch the next version
   of the bug class this audit exists because of.

### High
2. **✅ Fixed.** **`docs/05-architecture.md`'s "Accounts and auth" section and API-surface table describe the
   pre-better-auth system** — hand-rolled scrypt sessions, `/api/auth/{login,register,logout,me}`
   routes that were deleted in #15. A contributor relying on this doc to understand auth would
   build against a system that no longer exists (43 §`docs/05`).
3. **✅ Fixed.** **`docs/09-pages.md` is missing roughly a third of the site's real routes** (Character mode,
   All Words, Custom Quiz, `/account`, forgot/reset-password) and still describes a `/dashboard`
   route that was folded into `/` back in docs/hold/29 (43 §`docs/09`).
4. **✅ Fixed.** **`docs/01-overview.md` and `docs/04-data-pipeline.md` both still claim SQLite-in-dev** — false
   since the Postgres migration; a new contributor following either doc's setup steps literally
   would expect zero-setup SQLite and get confused by the real `DATABASE_URL` requirement (43
   §`docs/01`, §`docs/04`).
5. **✅ Fixed.** **`docs/21-vercel-deploy.md` says "just `DATABASE_URL`, no other env vars needed"** — four more
   are required since #15 (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`,
   `GMAIL_APP_PASSWORD`). Following this doc literally produces a deploy that can't run auth (43
   §`docs/21`).
6. **✅ Fixed** (`scripts/confirm-write.ts`, wired into `prisma/seed.ts` and `backfill-mnemonics.ts`).
   **No environment guard on any write-capable local script** — `prisma migrate dev`,
   `prisma studio`, `db:seed`, and `backfill-mnemonics.ts` all point at the single shared
   production database with nothing stopping an accidental run (45 §2). This has been a known,
   documented tradeoff since the Postgres migration ("revisit once there's real production data
   worth isolating") — there now is.

### Medium
7. **✅ Fixed** (`src/lib/api-rate-limit.ts`, 20/60s per user). **`/api/attempts` has no rate limiting**, and its `score`/`total` are client-supplied with no
   server-side check that a real quiz session produced them — a logged-in user can script POSTs to
   pad any leaderboard indefinitely (40 §backend, "Rate-limiting coverage"). (The client-supplied
   `score`/`total` validation gap itself is unchanged — only the spam/flood vector was addressed.)
8. **✅ Fixed.** **`AddFriendForm.tsx` has an unguarded `fetch`** — a network failure (not just a non-OK
   response) leaves the submit button permanently stuck disabled with no error shown. The fix
   pattern already exists two files away in `FriendRequestRow.tsx` (42 §4, 44 §9).
9. **✅ Fixed** (extracted into `src/quiz/submit-attempt.ts`, all four runners now show a
   "couldn't be saved" message). **All four quiz runners silently drop a failed `POST /api/attempts`** — they check for network
   errors but never check `res.ok` before chaining into the best/leaderboard fetches, so a 500
   leaves the player believing their score was recorded when it wasn't. One bug, duplicated in
   four files (42 §3).
10. **✅ Fixed.** **No focus management in `CharacterBrowse`'s popup or `LogoutButton`'s confirm dialog** — focus
    isn't moved in on open or restored on close in either, undermining `aria-modal="true"` for
    keyboard/screen-reader users (42 §5).
11. **✅ Fixed** (`.catch()` added, logs to console). **Silent, unobservable failure path in the password-reset email send** — `sendResetPassword`
    fire-and-forgets `sendEmail` with no `.catch()`; a Gmail SMTP hiccup means a user requesting a
    reset gets no email and no error, and nothing logs it anywhere an operator would see (40
    §backend "send-email.ts", 45 §6).
12. **✅ Fixed** (`@types/node` bumped to `^22`). **`@types/node` (20.x) is pinned behind the actual Node 22 runtime** `engines.node` requires —
    type definitions don't match what's actually running (45 §5).
13. **✅ Fixed** (`npm audit --audit-level=high` added to CI). **No dependency vulnerability scanning in CI** — no `npm audit` step, no Dependabot/Renovate
    config (45 §4).
14. **✅ Fixed** (`@@index([friendId, status])`). **Missing index on `Friendship.friendId`** — two of `getFriendsData`'s four queries filter on
    `friendId` alone, which the existing `@@unique([userId, friendId])` can't serve (40 §backend,
    schema section).
15. **✅ Fixed.** **`docs/38`/`docs/39` both reference a "docs/34" that doesn't exist** anywhere in the repo,
    active or archived — the file lived on the mnemonics branch that was deleted and restarted
    under docs/39 instead, and the references were never updated (43 §`docs/38`/`docs/39`).
16. **✅ Fixed.** **`docs/06-quiz-mechanics.md` contradicts itself two sections apart** — the Browse subsection
    still says mnemonics are "currently unpopulated everywhere," while the Mnemonics subsection two
    paragraphs later correctly says all 774 words have one. Leftover from before #18 merged (43
    §`docs/06`).
17. **✅ Fixed.** **`docs/08-ui-ux.md`'s component inventory contradicts its own Layout section** on what
    `AppHeader` contains, and names three components (`PillButton`, `ScoreTimerBar`, `PercentBadge`)
    that don't exist under those names in the actual code (43 §`docs/08`).

### Low / nitpick (worth a pass, not urgent)
18. **✅ Fixed** (both deleted). Dead code: `src/quiz/character-choices.ts` (whole file, unreferenced since #17's Character mode
    rebuild) and `MatchQuizRunner`'s `variant="character"` branch (unreachable — nothing ever
    passes it) (42 §1).
19. **✅ Fixed** (removed). `getChapterDialogLineCount` in `queries.ts` is exported but has zero callers (40 §backend).
20. **Partially fixed.** `shuffle`/`averagePercent` (✅ extracted into `submit-attempt.ts`) /`ToolbarButton`/the attempt-submission effect (✅ extracted)/the results-screen
    JSX are all copy-pasted near-verbatim across the four quiz runners — the helpers are
    low-risk duplication, but the results-screen JSX and submission effect encode real per-mode
    scoring semantics and are a much stronger case for extraction (42 §2). **`ToolbarButton` and the
    results-screen JSX itself are still duplicated across all four runners** — deliberately held
    over as its own dedicated refactor pass, riskier than the parts already extracted.
21. Still open, deliberately (low severity, unreachable today). A handful of latent `NaN`-on-empty-word-list landmines in the runners' `goTo()` — not reachable
    today (every caller guards `words.length === 0` upstream) but worth a defensive guard for the
    next caller that doesn't (44 §"Edge cases" 1-2).
22. Still open, deliberately (each intentional per its own code comment, re-confirmed on re-audit). Mode inconsistencies a player would read as bugs even though each is individually intentional
    per its own code comment: Hard mode only in Pinyin mode, live "Missed" counter only in
    Character mode, no Shuffle button in `MatchQuizRunner` (44 §"Mode inconsistencies").
23. **✅ Fixed** (`/sign-up/email`: 5 per 60s). Registration (`/sign-up/email`) has no custom rate-limit rule, falling back to better-auth's
    generous 100-per-10s default (45 §7).
24. **✅ Fixed** (`next.config.ts`, prod strips `unsafe-eval`). No `Content-Security-Policy` header (45 §8).
25. **✅ Fixed** — `/api/cron/purge-rate-limits` + Vercel Cron (`vercel.json`), see 41 §backend.
    `RateLimit` table rows are never purged — unbounded growth over a long production lifetime (40
    §backend, schema section).
26. Numbering gaps in `docs/`: no `docs/31`, and `docs/34` (see #15 above) — informational, only
    actually confusing where it manifests as the dangling references (43, "Numbering gaps").

## What's explicitly *not* a finding

Each audit was told to state plainly when an area was clean rather than padding with nitpicks.
Worth repeating here so this doesn't read as "everything is broken": auth-route session checks,
error-response shape consistency, the one raw-SQL query's parameterization, `maybe-migrate.mjs`'s
production-only gating, session/cookie security flags, `.env.example` completeness, rate-limit
storage atomicity, and the Pause-button gating across all four runners were all checked carefully
and came back clean. This is a small, carefully-commented codebase — the findings above are real,
but they're the kind of gaps that accumulate in *any* project built this fast, not signs of
carelessness.

## Suggested next step

Not decided here — this doc is the inventory, not the plan. Worth a conversation about what to
tackle first: the docs fixes (18-25, cheap and mechanical) could reasonably happen in one pass;
the security/reliability items (6-13) probably deserve their own focused doc+PR each, the way
every other feature in this repo has; and the testing gap (1) is its own project, not a quick fix.
