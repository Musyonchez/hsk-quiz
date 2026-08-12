# Audit: docs consistency

Part of the [project audit](40-project-audit-overview.md) (Aug 2026). Scope: every file under
`docs/*.md` (active docs — `docs/hold/` only as needed for cross-reference), `README.md`,
`CLAUDE.md`, `AGENTS.md`, all cross-checked against the actual current code, not just read in
isolation.

This is the biggest of the five audits by volume — several active docs describe a shape of the app
that no longer exists, in ways that would actively mislead a reader rather than just being
incomplete.

## `docs/01-overview.md`

- **Claims "Dev/testing: SQLite, file-based, zero setup"** — false since docs/hold/20's Postgres
  migration; `schema.prisma` only declares `provider = "postgresql"`, no SQLite anywhere. A
  contributor reading this "what this is" doc first would expect zero-setup SQLite and get
  confused by the real `DATABASE_URL` requirement in `README.md`/`.env.example`. **High** —
  actively misleads new-contributor setup expectations.
- **"Non-goals" section still says "No email collection or 'forgot password' flow... no address to
  send a reset link to."** Reversed by docs/36: registration requires email, and there's a full
  forgot-password/reset-password flow. **High** — directly contradicts current, shipped behavior,
  with nothing flagging it as superseded.

## `docs/04-data-pipeline.md`

- **"When it runs" still says seeding runs "against whichever database... SQLite in dev, Postgres
  in prod."** Same stale split as docs/01. **Medium** — confusing about which DB seeding touches,
  though the actual command (`npm run db:seed`) is unaffected.

## `docs/05-architecture.md`

- **The entire "Accounts and auth" section describes the pre-docs/36 hand-rolled system** — scrypt
  hashing via `node:crypto`, a plain server-side session token, no third-party provider. The actual
  current implementation (self-hosted better-auth, `Account`/`Verification`/`RateLimit` schema,
  email+username login, real forgot-password flow) isn't mentioned at all. **High** — this is the
  architecture doc's own dedicated auth section; a contributor relying on it would build against a
  system that no longer exists. docs/36 and docs/37 (both later, active docs) fully superseded this
  section but it was never updated to even point at them.
- **The "API surface" table still lists `POST /api/auth/login`, `POST /api/auth/register`,
  `POST /api/auth/logout`, `GET /api/auth/me`** — all four deleted in docs/36's migration (confirmed:
  `src/app/api/auth/` only contains `[...all]/route.ts`, better-auth's catch-all). **High**.
- **The folder-layout listing repeats the same four now-deleted route files** instead of the real
  `api/auth/[...all]/route.ts`. **Medium** (same root cause, different section).
- Worth noting: this doc *does* proactively flag other sections as stale elsewhere (it correctly
  calls out that §1.5 of docs/09 is out of date) — which makes its own un-flagged auth staleness
  more likely to mislead, since the doc demonstrates it knows how to self-correct and just didn't
  here.

## `docs/09-pages.md`

The most out of date of the active docs — describes a shape of the app from well before docs/25,
docs/36, docs/37, docs/38.

- **§0/§0.5 (Login/Register)**: "No 'forgot password' flow... No email is collected at all";
  Register described as no email field. Both wrong. **High**.
- **Both sections say login/register redirect to `/dashboard`** — they actually
  `window.location.href = "/"`; there is no `/dashboard` route at all (folded into `/` per
  docs/hold/29, which docs/05 itself already notes elsewhere). **High**.
- **§1.5 "Dashboard — `/dashboard`" describes a route that doesn't exist** — no `src/app/dashboard/`
  anywhere; its content now lives in `page.tsx`'s `LoggedInHome`. **High**.
- **Missing entirely from this "full sitemap" doc**: `/account`, `/forgot-password`,
  `/reset-password`, `/custom-quiz` + `/custom-quiz/quiz` (cross-level custom quiz),
  `/hsk/[level]/custom/quiz` (single-level custom quiz), the whole All Words feature
  (`/hsk/[level]/chapter/[chapter]/all` + `/all/quiz` + `/all/words`), and Character mode
  (docs/38) entirely. **High** — a doc explicitly billed as "lists every page so none of them get
  designed as an afterthought" omits roughly a third of the site's actual routes.
- "Explicitly not building: a settings/preferences page" sits oddly next to the now-real `/account`
  page (change password) — arguably not the same thing as "preferences," but worth a glance.
  **Low/nitpick**.

## `docs/08-ui-ux.md`

- **Internally contradicts itself**: the component inventory says `<AppHeader>` is "logo/name,
  level switcher, nothing else," while the Layout section two screens earlier correctly says the
  header "carries the logged-in user's name/avatar plus Leaderboard and Friends links." The actual
  `AppHeader.tsx` includes `/custom-quiz`, `/leaderboard`, `/friends`, `/account` links plus
  `UserBadge` and auth CTAs — matching the Layout section, not the inventory line. **Medium** —
  contradicts itself within the same doc; the inventory line is the wrong one.
- **Names three components that don't exist under those names**: `<PillButton variant="primary" |
  "secondary">`, `<ScoreTimerBar>`, `<PercentBadge>` — the real implementation uses a `pillClasses()`
  helper function, not a `<PillButton>` component, and there's no `ScoreTimerBar`/`PercentBadge`
  (that UI is built inline per-runner). This doc is explicitly "written up front, before any
  implementation," so some drift from aspirational names is expected — but a contributor searching
  for these exact names to reuse them comes up empty. **Low/medium**.

## `docs/21-vercel-deploy.md`

- **"Env vars" section says "Just `DATABASE_URL`... No `NODE_ENV` needed."** Predates docs/36,
  which added `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` as
  required for both local `.env` and Vercel Production/Preview. **High** — this is the doc a
  contributor would follow to configure a fresh Vercel deploy; following it literally produces a
  build that can't run auth at all. The one-time-setup steps also only mention confirming
  `DATABASE_URL`, no mention of the auth env vars.

## `docs/38-character-mode-overhaul-plan.md` and `docs/39-memory-aid-mnemonics-plan.md`

- **Both reference "docs/34" as the source of the mnemonics plan/reasoning** — no `docs/34` file
  exists anywhere, active or in `docs/hold/` (numbering jumps straight from 30/hold-32/hold-33 to
  35; there's also no docs/31). This was apparently the doc living on the deleted/unmerged
  `feat/memory-aid-mnemonics` branch mentioned in docs/39's own "Why, and why restarted" section —
  the reference was never updated to point at docs/39 itself once the work was redone under that
  number. **Medium** — dangling reference to a file that will never land; docs/39 itself is
  otherwise accurate.

## `docs/06-quiz-mechanics.md`

- **Self-contradicts two sections apart**: the "Browse (`CharacterBrowse`)" subsection still says
  the popup shows a mnemonic "when one exists (`QuizWord.mnemonic`, currently unpopulated
  everywhere — see 'Mnemonics' below)," while the doc's own later "Mnemonics" subsection correctly
  says all 774 words across all 3 levels have one, backfilled onto `Word.mnemonic`. Confirmed
  against code: `src/quiz/mnemonics/{hsk1,hsk2,hsk3}.ts` cover all three levels, backfill has run
  per docs/39's verification. **Medium** — leftover line from before docs/39 merged; the
  "currently unpopulated everywhere" clause is simply false today.

## Numbering gaps (informational)

No `docs/31` and no `docs/34` exist anywhere, active or archived (numbering jumps `...30, 32, 33,
35...`). `31` is unexplained; `34` is explained indirectly (see above) but the two stale
cross-references make the gap actively confusing rather than just cosmetic. **Low/nitpick**,
except where it manifests as the broken references above.

## What was checked and found accurate

`docs/hold/*` links all point to files that actually exist there — no broken archive references.
