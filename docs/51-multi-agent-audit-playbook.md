# Multi-agent audit playbook (reusable)

## Why this doc exists

Two full-sweep audits have already run against this repo — [40-project-audit-overview.md](40-project-audit-overview.md)
(+ its five companion docs, 41-45) and [50-full-sweep-audit-2026-08.md](50-full-sweep-audit-2026-08.md).
Both used the same underlying process, worked out ad hoc each time. This doc extracts that process
so the next audit starts from a known-good shape instead of being re-invented, or copied wholesale
from a generic template that doesn't fit this app.

That generic template is the actual trigger for writing this down: a prompt (from a different
source, not this repo) proposing a "comprehensive multi-agent project audit" with **17 named
specialized agents** (architecture, bugs, UI/UX, accessibility, frontend quality, backend,
database, security, performance, testing, product gaps, user journeys, content/microcopy, visual
polish, docs/DX, dependencies, plus a final cross-check agent) and a five-tier P0-P4 severity
scale. That's sized for a product with a much bigger surface than this one has — multiple
third-party integrations, file uploads, a CSRF-relevant surface, an actual test suite to grade
coverage of. This app has none of those: no third-party integrations beyond Gmail SMTP and Neon,
no file uploads, no CSRF surface (better-auth session cookies, no cross-site form posts to guard),
and — per [40-project-audit-overview.md](40-project-audit-overview.md) item 1 — deliberately no
test suite. Running 17 agents here would mostly produce "nothing found in scope, N/A" reports:
noise, not signal.

What's worth keeping from that template, and what this doc keeps: the phase structure (discovery →
parallel specialized audits → cross-check → consolidate → prioritize), the evidence-format
discipline (file:line, why, fix, confidence — not vague "could be improved" claims), and
"audit first, modify later" so one agent's in-flight fix doesn't contaminate another agent's
still-in-progress findings. What's dropped: the 17-agent fixed roster and the five-tier severity
scale, both replaced below with something sized to this repo.

(Note on provenance: this file was rewritten from scratch rather than restored from a prior
version of itself, specifically to avoid carrying forward any stale assumption unnoticed. The
lenses and lessons below are drawn from what [40](40-project-audit-overview.md)/[41-45](41-audit-backend-data.md)
and [50](50-full-sweep-audit-2026-08.md) actually found, which is repo history, not the deleted file.)

## When to reach for this

- A periodic full-sweep once enough feature work has landed since the last one (roughly the cadence
  that produced docs/40 and docs/50).
- Before a "real users" milestone.
- After a bug turns out to be a *class* of bug rather than a one-off (the mobile-menu Log-out bug
  that triggered docs/40 is the worked example — worth asking "what else is like that").
- Not for every PR — that's what `/code-review` is already for. This is heavier and slower, and
  earns its cost only at wider intervals.

## Phase structure

1. **Discovery.** Quick pass noting what's changed since the last audit — new routes, new
   components, new dependencies, schema changes, new docs. Skippable if the answer is obviously
   "not much."
2. **Specialized parallel audits.** Read-only. No code changes. Each lens (below) runs
   independently so findings aren't biased by another lens's framing.
3. **Cross-check / consolidation.** Before a claim becomes a written finding, verify it against
   the real code — see "Evidence discipline" below. This is the step that catches a
   plausible-sounding but wrong claim before it's permanent.
4. **Prioritize.** One master doc (or a short overview doc + companions, see "Deliverable shape"),
   severity-ranked.
5. **Fix.** Separate PRs, each verified live individually — not one big batch of unverified
   changes landing at once.

## The lenses

Pick the ones plausible given what's actually changed since the last pass — don't run all of them
as a reflex. A round with nothing new in `src/lib/` doesn't need a fresh backend audit.

- **Backend & data** — `prisma/schema.prisma`, migrations, `src/lib/**`, API routes under
  `src/app/api/**`: input validation, auth/authorization checks, rate-limit coverage, N+1 queries,
  missing indexes, transaction boundaries, error-response consistency.
- **Frontend & components** — `src/components/**`, `src/quiz/**`: duplication across the four
  quiz runners, dead code/dead exports, accessibility (labels, focus management, `aria-*`), mode
  parity (does a fix/feature in one quiz mode need the same treatment in the other three?).
- **Docs consistency** — every doc in `docs/` checked against the actual code: stale claims,
  broken cross-references, a doc contradicting itself a section later (docs/43's whole reason for
  existing).
- **Quiz/product UX gaps** — walk the actual quiz flows as a player would: mode inconsistencies,
  missing feedback after actions, dead ends, unhandled form-submission failures.
- **Infra & security** — CI config, `vercel.json`/`next.config.ts`, dependency freshness,
  `npm audit`, secrets handling, CSP, rate-limit completeness across both better-auth and app
  routes.
- **Repo/file structure** — folder organization and naming; whether a folder has outgrown a flat
  layout. This is what surfaced the `src/components/` and `src/lib/` reorg in docs/50 (27 files in
  one flat folder spanning five unrelated concerns).

## Severity scale

Reuse this repo's existing three tiers — **High / Medium / Low** — already used consistently
across docs/41-45 and docs/50. Don't introduce a new scale per audit.

- **High** — broken functionality, a real security gap, or a doc that would actively mislead a
  new contributor following it.
- **Medium** — a real gap worth its own PR soon, but nothing is on fire today.
- **Low** — nitpick, cosmetic, or a deliberately deferred tradeoff — state the reason it's
  deferred, don't just leave it bare.

## Evidence discipline (non-negotiable)

- Every finding needs: file path (+ line where it matters), what's actually there, why it's
  wrong, and a concrete fix. "The architecture could be improved" is not a finding.
- Verify before writing something down as fact. Grep for real callers before calling something
  dead code. Trace the actual code path before asserting a bug exists, rather than trusting how
  plausible it looks.
- **The worked example of why this matters** is in docs/50's backend section: an audit pass
  initially concluded that mnemonics were "always undefined at runtime" because no `queries.ts`
  call site explicitly selected `Word.mnemonic`. That reasoning was plausible and wrong — Prisma
  returns the full row when nothing narrows the `select`, so the field rides through unchanged,
  and a live check of `CharacterBrowse` showed the mnemonic actually rendering. The correction is
  written into the doc permanently as "correction to the backend-audit agent's own finding,"
  rather than quietly fixed — evidence that the check happened, not just the conclusion.
- State plainly when a whole area comes back clean (docs/40's "What's explicitly not a finding"
  section, docs/50's infra/security section). Padding a report with speculative nitpicks to look
  thorough is worse than a short "checked, no issues" — and it's what separates this from the
  17-agent template's failure mode of forced findings in every category.

## Consolidation rules

- One overview doc with the prioritized list. Split into companion docs per lens only if findings
  are substantial enough to need it (docs/41-45's split from docs/40 is the template for "a lot of
  findings"; docs/50's single sectioned doc is the template for "lighter, fits in one file").
- Merge duplicate findings surfaced by different lenses into one entry with combined evidence —
  don't file five tickets for one root cause.
- When a later pass re-checks an earlier finding, annotate the original line **✅ Fixed** inline
  rather than deleting or rewriting it. Keeps the doc an honest inventory of what was found and
  confirmed resolved, not a moving target — see docs/40's "Status update" section and its inline
  markers for the pattern.

## Audit-first, modify-later

No code changes during the audit itself — findings only. Fixes land afterward as separate,
individually verified PRs. Batching unverified fixes together is exactly how a wrong finding (see
the mnemonics example above) turns into a wrong fix nobody catches before it merges.

## What NOT to do

- Don't spawn a large fixed agent roster regardless of whether this repo actually has surface area
  for each one. No file-upload audit — there are no file uploads. No test-coverage audit — there's
  deliberately no test suite ([40](40-project-audit-overview.md) item 1). No sweeping
  third-party-integration audit — Gmail SMTP and Neon are the only two, and both are already
  covered under infra & security.
- Don't invent a new severity scale or issue-table schema per audit. Reuse High/Medium/Low and the
  existing prose-list format that every audit doc so far has used.
- Don't record "the app could have feature X" as a finding unless it's justified by something the
  app already promises (README, [01-overview.md](01-overview.md)'s stated scope). This is a
  personal-scale study app for a small group of users, not a product-backlog brainstorm.
- Don't let an agent's confidence substitute for verification. "Highly likely bug" still needs
  someone to actually trace the code path before it's written into a doc as a finding.

## Deliverable shape

- Multi-doc (docs/40-45) or single-doc (docs/50) — pick based on volume, don't force a 5-doc split
  for a handful of findings.
- Update [docs/README.md](README.md)'s index when adding a new audit doc, so it doesn't become
  another file nobody can find without already knowing it exists.
