# Docs index

Docs/50's full-sweep audit flagged this folder as having grown to 50 files with no map — this is
that map. Three tiers, in order of how likely a doc is to still be accurate today:

## 1. Living reference (read these first, and trust them)

Describe the app's *current* shape. Kept up to date as things change — if one of these ever
drifts, that's a bug, not expected staleness.

- [01-overview.md](01-overview.md) — what this is, non-goals, why two data sources
- [05-architecture.md](05-architecture.md) — tech stack, schema, folder layout, API surface
- [06-quiz-mechanics.md](06-quiz-mechanics.md) — how each quiz mode actually works
- [08-ui-ux.md](08-ui-ux.md) — layout, component inventory, visual language
- [09-pages.md](09-pages.md) — every route, what it does
- [10-color-palette.md](10-color-palette.md) — the color system

## 2. Historical / point-in-time (accurate about *when they were written*, not necessarily today)

Dated plan docs and incremental logs — each one is the record of a specific piece of work, not a
promise that nothing since has changed it. Numbered roughly chronologically; the higher the
number, the more recent (and usually the more currently-accurate) the doc.

- [02-data-sources.md](02-data-sources.md) — self-flagged historical (extraction pipeline retired)
- [03-content-extraction-rules.md](03-content-extraction-rules.md), [04-data-pipeline.md](04-data-pipeline.md) — data pipeline
- [07-roadmap.md](07-roadmap.md) — phase-by-phase build log
- [16-deploy.md](16-deploy.md), [21-vercel-deploy.md](21-vercel-deploy.md) — deploy setup
- [35-ci-cd-plan.md](35-ci-cd-plan.md) — CI setup
- [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md),
  [37-auth-hardening-and-ux-plan.md](37-auth-hardening-and-ux-plan.md) — the auth rewrite
- [38-character-mode-overhaul-plan.md](38-character-mode-overhaul-plan.md) — Character mode
- [39-memory-aid-mnemonics-plan.md](39-memory-aid-mnemonics-plan.md) — mnemonics feature
- [46-quiz-runner-duplication-refactor.md](46-quiz-runner-duplication-refactor.md) — first dedup pass
- [47-word-sentence-audio-plan.md](47-word-sentence-audio-plan.md) — pronunciation audio
- [48-quiz-pre-start-progressive-reveal-plan.md](48-quiz-pre-start-progressive-reveal-plan.md) — progressive reveal
- [49-migration-advisory-lock-fix.md](49-migration-advisory-lock-fix.md) — a specific incident + fix

## 3. Audits (findings-at-a-point-in-time; check for "✅ Fixed" annotations before trusting a claim)

Read-only sweeps of the whole repo. Findings are annotated **✅ Fixed** inline once resolved
rather than rewritten out — an unannotated line in one of these may already be stale even though
the doc itself hasn't been touched since.

- [40-project-audit-overview.md](40-project-audit-overview.md) — the prioritized summary of the
  first audit round; start here, not at 41-45 directly
- [41-audit-backend-data.md](41-audit-backend-data.md), [42-audit-frontend-components.md](42-audit-frontend-components.md),
  [43-audit-docs-consistency.md](43-audit-docs-consistency.md), [44-audit-quiz-ux-gaps.md](44-audit-quiz-ux-gaps.md),
  [45-audit-infra-security.md](45-audit-infra-security.md) — the five detailed companion audits
- [50-full-sweep-audit-2026-08.md](50-full-sweep-audit-2026-08.md) — second full-sweep round
  (best practices, duplication, file structure); start here for the most recent state

## Archive

`docs/hold/` — superseded plans and abandoned drafts, kept for historical reference. Nothing
active depends on anything in there.
