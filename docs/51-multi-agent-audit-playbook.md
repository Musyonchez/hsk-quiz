# Multi-agent audit playbook

A reusable template for running a full project audit, adapted to this repo's stack and
conventions. Not a one-time report — **run this playbook whenever the next deep audit is due**
(a new major feature landed, it's been a while since docs/40/50, or something felt "off" in a few
different places at once). The two audits this repo has actually run
([40-project-audit-overview.md](40-project-audit-overview.md),
[50-full-sweep-audit-2026-08.md](50-full-sweep-audit-2026-08.md)) both used a flatter version of
this — five parallel agents, one pass, done. This doc formalizes what worked about that, folds in
a phase structure worth adding next time (cross-checking and consolidation as explicit steps
rather than something I did informally while writing up findings), and adapts a broader
external template down to what's actually relevant for an app this shape and this size.

**Explicitly not adopted from the source template**: agent letters A through Q (17 named
specialized agents) is calibrated for a much larger product surface than this one. This app has
no third-party integrations beyond Gmail SMTP and Neon, no file uploads, no CSRF surface (same-
origin, no cookie-based cross-site mutation vector), no design-system token layer beyond Tailwind
config, and — per [40's decision](40-project-audit-overview.md#L53) — deliberately no test suite
to audit test *coverage* of. Running 17 agents here would mean most come back with "nothing found
in scope," which is its own form of noise. The right agent count for this project is the 5-8
range actually used in docs/40 and docs/50; the section below explains how to size it per-run.

## When to run this

- A meaningful chunk of feature work has landed since the last audit (rule of thumb: 8-10 merged
  PRs, or a new subsystem like auth/audio/SEO).
- Something surprising broke in production (like [49's advisory-lock
  incident](49-migration-advisory-lock-fix.md)) — worth asking "what else is like that."
- Direct request for a general sweep, not tied to a specific bug.

Not a substitute for the plan-doc-first workflow on a specific feature — this is for the
"step back and look at the whole thing" case.

## Phase 0 — Scope the run

Before spawning anything, decide:

1. **Full sweep or targeted?** A full sweep (like docs/50) covers backend/data, frontend
   components, file structure, docs, infra/security — 5 agents, each broad. A targeted audit picks
   1-3 of those and goes deeper (e.g. "just UX gaps across all four quiz runners," which is
   basically what [44-audit-quiz-ux-gaps.md](44-audit-quiz-ux-gaps.md) already was).
2. **What's actually in scope for this project right now** — check this list against the current
   codebase before assigning agents, since it drifts:
   - Frontend: Next.js App Router pages (`src/app/`), the four quiz runner components + their
     shared hooks (`src/quiz/use-quiz-*.ts`), `src/components/{quiz,auth,friends,layout,vocab}/`
   - Backend: Route Handlers (`src/app/api/**/route.ts`), `src/lib/queries.ts`, `src/lib/auth/`
   - Data: `prisma/schema.prisma`, migrations, Neon Postgres (pooled + unpooled connections)
   - Quiz engine: `src/quiz/*` (pinyin matching, scoring, mnemonics, audio manifests)
   - Infra: `next.config.ts` (CSP), `vercel.json`, `.github/workflows/ci.yml`, `prisma.config.ts`
   - Docs: `docs/*.md` (see [docs/README.md](README.md) for current/historical/audit tiers)
   - **Explicitly out of scope unless the run says otherwise**: automated test coverage (no suite
     exists, decided against per docs/40 item 1), third-party integrations (there are effectively
     none — Gmail SMTP and Neon are the only external services, both already covered under
     infra/security), native mobile.
3. **Read the last audit first.** Don't re-discover what docs/40/50 already found and marked
   ✅ Fixed — that wastes an agent's investigation budget re-confirming settled findings instead of
   looking for what's new.

## Phase 1 — Discovery (only for a full sweep, or a targeted audit touching unfamiliar territory)

One pass, not per-agent, to avoid every specialized agent re-reading the same folder structure
from scratch. Skip this phase entirely for a small targeted audit where the scope is already
well understood.

Produce a short shared brief covering:

- Current folder structure (compare against [05-architecture.md](05-architecture.md)'s folder
  layout — flag drift, don't just trust the doc)
- What's shipped vs. what docs/07's roadmap still lists as deferred
- Recent commits/PRs since the last audit (`git log --oneline` since the last audit doc's date)
- Known-accepted tradeoffs not worth re-flagging (e.g. CSP `unsafe-inline` on
  script/style — documented deliberate choice in `next.config.ts`'s own comments; no automated
  tests — docs/40 item 1)

Hand this brief to every specialized agent in Phase 2 as shared context.

## Phase 2 — Specialized audits (parallel)

Each agent gets a **narrow, explicit scope** (specific files/directories, not "look at
everything") and is told explicitly not to duplicate another agent's territory. Pick the subset
relevant to this run — not every audit needs all of these:

- **Backend/data** — `src/app/api/**`, `src/lib/queries.ts`, `src/lib/auth/`, `src/lib/db.ts`,
  `prisma/schema.prisma` + migrations, `src/quiz/submit-attempt.ts`, `src/quiz/audio-player.ts`.
  Auth checks, rate limiting, N+1 queries, error-response consistency, dead exports.
- **Frontend components** — `src/components/**`, the four quiz runners + shared hooks in
  `src/quiz/use-quiz-*.ts`. Duplication (check it against the last known-fixed state — see docs/46
  and docs/50 §6-7 for what "fixed" already looks like here), oversized files, a11y gaps,
  inconsistent patterns across the four runners.
- **File/folder structure** — repo-wide, organization only (not logic). Flat directories past a
  useful size, misplaced files, orphaned scripts/docs, stale cross-references, `package.json`
  dependency/script drift.
- **Docs consistency** — `docs/*.md` + `README.md`/`AGENTS.md`/`.env.example`, cross-checked
  against real code (not just read in isolation). Check "✅ Fixed" annotation coverage on prior
  audits too — an unannotated stale finding is worse than no finding, since a direct reader
  believes it.
- **Infra/security** — `next.config.ts`, `vercel.json`, `prisma.config.ts`, `.github/workflows/`,
  `src/lib/auth/auth.ts`'s rate-limit config, CSP, env var completeness, cron auth, dependency
  versions.
- **UX/product gaps** (targeted runs only, or fold into frontend-components for a full sweep) —
  trace actual user flows through the quiz runners, auth forms, friends/leaderboard — the pattern
  docs/44 already used. Cross-mode inconsistencies a player would read as bugs even when each is
  individually intentional (check the runner's own code comment before flagging).

Each agent's report should follow the evidence format below — no vague "could be improved"
findings.

### Evidence format (every finding)

- **Severity**: High / Medium / Low (this repo's existing three-tier scale — see docs/41/42/44/45
  for the established convention; there's no need for the source template's five-tier P0-P4 scale
  at this project's size, where "blocks launch" vs. "high" rarely needs its own tier)
- **File:line**
- **What's actually there** (quote or describe the real code/doc content)
- **Why it's a problem** (concrete failure scenario, not "this could be better")
- **Suggested fix**
- **Confidence**: confirmed (traced the actual execution path) vs. suspected (looks wrong,
  not fully traced)

## Phase 3 — Cross-check

Before writing anything up, sanity-check the raw findings:

- **Verify suspected-but-not-confirmed findings** — trace the actual code path, or run it live
  (this repo's established pattern: `next dev` + Playwright, since the sandbox has no outbound
  network access for a real `next build`).
- **Look for findings that contradict each other** — one agent claims X is broken, another relied
  on X working. (Concretely happened in this project: the backend-data agent claimed
  `Word.mnemonic` never reaches `QuizWord` at runtime; a live Playwright check during the docs pass
  proved it already does — `queries.ts` never `select`-narrows `Word`. Always worth a live check
  before writing a finding into a doc as fact — see docs/50's "Correction" note for the writeup.)
- **Look for root-cause overlap** — two agents flagging the same underlying issue from different
  angles (e.g. frontend-components flags a duplicated `shuffle()`, backend-data flags the same
  duplication in a different file) should become one finding with both file locations, not two.

## Phase 4 — Consolidate

Write the findings into one doc: `docs/<next-number>-<short-name>.md`. Follow the pattern
docs/40/50 already established:

- Group by area (backend/frontend/structure/docs/infra, or whatever the run's scope was)
- One line per finding: severity, what's wrong, suggested fix
- Mark items **explicitly decided against** (not just "still open") when that's the actual
  decision — e.g. docs/40 item 1's "no test suite" is a decision, not an oversight, and the doc
  says so plainly
- Cross-link to the relevant existing docs (architecture, prior audits) rather than repeating
  their content

## Phase 5 — Prioritize and implement

This repo's existing workflow already covers this well — keep using it:

- Real bugs / correctness fixes first, dedup/structure cleanup second, docs last (the actual order
  the docs/50 sweep shipped in, as three separate PRs)
- One branch + PR per concern, not one giant PR — makes each change reviewable and independently
  revertible
- `tsc --noEmit` + `eslint .` clean before shipping (this repo's actual CI gate — see
  `.github/workflows/ci.yml`)
- Smoke-test live via `next dev` + Playwright for anything touching a user-facing flow, not just a
  type-check — the type-checker doesn't catch a circular hook dependency or a broken click handler
- Mark each finding **✅ Fixed** inline in the audit doc once shipped and verified, rather than
  rewriting it out of the list (established convention across docs/41/42/44/45/50) — an audit doc
  is a historical record, not a living checklist that gets edited away
- Annotate (don't archive) an audit doc even once every finding is fixed — docs/43's own history
  is the cautionary example: it sat with zero "✅ Fixed" markers for a while even after everything
  in it was resolved elsewhere, and would have misled a reader who opened it directly instead of
  going through docs/40's summary first

## What NOT to do (lessons already learned in this repo)

- **Don't let 17 agents each "look at everything."** Massive overlap, shallow individual reports,
  and no agent owns catching what falls between two scopes. Narrow, explicit scopes beat broad
  vague ones — same reasoning that motivated adapting this template down in the first place.
- **Don't skip the live-verification step.** A finding that's "probably right" based on reading
  code alone can be wrong (see the mnemonic example above) — this repo has a working dev server
  and Playwright MCP; use them before writing something into a doc as settled fact.
- **Don't treat an audit doc as done once findings are fixed without annotating it.** Future-you
  (or the next audit) reading it fresh has no way to tell "still open" from "fixed but the doc
  wasn't updated" unless it's marked.
- **Don't rewrite/archive an old audit doc's content when annotating it fixed.** Keep the original
  finding text, add the ✅ marker and a pointer to what fixed it — the doc's value as a historical
  record depends on not silently rewriting history.
- **Don't propose a rewrite/new-dependency/new-abstraction without naming the concrete problem it
  solves.** This project's actual audits (docs/40 item 1, the CSP `unsafe-inline` tradeoff, the
  "no Shuffle button in MatchQuizRunner" non-finding) show restraint pays off — several things
  that looked like gaps on first read turned out to be correct as-is once traced properly.
