# Docs index

Docs/50's full-sweep audit flagged this folder as having grown to 50 files with no map — this is
that map. Three tiers, in order of how likely a doc is to still be accurate today:

## 1. Living reference (read these first, and trust them)

Describe the app's *current* shape. Kept up to date as things change — if one of these ever
drifts, that's a bug, not expected staleness.

- [01-overview.md](01-overview.md) — what this is, non-goals, why the data pipeline works the way
  it does
- [05-architecture.md](05-architecture.md) — tech stack, schema, folder layout, API surface
- [06-quiz-mechanics.md](06-quiz-mechanics.md) — how each quiz mode actually works
- [08-ui-ux.md](08-ui-ux.md) — layout, component inventory, visual language
- [09-pages.md](09-pages.md) — every route, what it does
- [10-color-palette.md](10-color-palette.md) — the color system
- [51-multi-agent-audit-playbook.md](51-multi-agent-audit-playbook.md) — reusable process for the
  next full/targeted audit; not a finding-set itself, a "how to run one" reference
- [54-claude-skills-for-ui-ux.md](54-claude-skills-for-ui-ux.md) — project-neutral reference on
  Claude Skills/Design for UI/UX work, imported from [toolbox](https://github.com/Musyonchez/toolbox);
  not a description of hsk-quiz itself, kept here as forward-looking reference for future UI/UX
  passes on this site
- [53-comprehensive-audit-prompt-playbook.md](53-comprehensive-audit-prompt-playbook.md) — the
  generic, project-neutral ancestor docs/51 was adapted from, also imported from toolbox; kept for
  reference (e.g. adapting a *different* project's audit) — reach for docs/51 first when auditing
  this repo specifically
- [55-repo-setup-and-deploy-playbook.md](55-repo-setup-and-deploy-playbook.md) — generic repo
  hardening/CI-CD/deploy/auth checklist, also imported from toolbox; every item it covers is
  already done here via 16/21/35/36/37, kept live for its still-generalizable platform-gotcha and
  PR-bot sections

## 2. Historical / point-in-time (accurate about *when they were written*, not necessarily today)

Dated plan docs and incremental logs — each one is the record of a specific piece of work, not a
promise that nothing since has changed it. Numbered roughly chronologically; the higher the
number, the more recent (and usually the more currently-accurate) the doc.

- [04-data-pipeline.md](04-data-pipeline.md) — data pipeline (its two source-format docs,
  02/03, moved to `hold/` — see Archive below, extraction pipeline they described is fully retired)
- [07-roadmap.md](07-roadmap.md) — phase-by-phase build log
- [21-vercel-deploy.md](21-vercel-deploy.md) — deploy setup (its predecessor, 16, moved to
  `hold/` — see Archive below, self-superseded once the app left Render for Vercel)
- [35-ci-cd-plan.md](35-ci-cd-plan.md) — CI setup
- [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md),
  [37-auth-hardening-and-ux-plan.md](37-auth-hardening-and-ux-plan.md) — the auth rewrite
- [38-character-mode-overhaul-plan.md](38-character-mode-overhaul-plan.md) — Character mode
- [39-memory-aid-mnemonics-plan.md](39-memory-aid-mnemonics-plan.md) — mnemonics feature
- [46-quiz-runner-duplication-refactor.md](46-quiz-runner-duplication-refactor.md) — first dedup pass
- [47-word-sentence-audio-plan.md](47-word-sentence-audio-plan.md) — pronunciation audio
- [48-quiz-pre-start-progressive-reveal-plan.md](48-quiz-pre-start-progressive-reveal-plan.md) — progressive reveal
- [49-migration-advisory-lock-fix.md](49-migration-advisory-lock-fix.md) — a specific incident + fix
- [57-saved-words-plan.md](57-saved-words-plan.md) — bookmarking individual words, drillable via
  the existing quiz runners (v1 built; multi-list/onboarding/auto-hide still plan-only, see its
  **Later** section)

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
  (best practices, duplication, file structure)
- [52-audit-2026-08-14.md](52-audit-2026-08-14.md) — third round, first real run of the
  [51-multi-agent-audit-playbook.md](51-multi-agent-audit-playbook.md) process
- [56-audit-2026-08-16.md](56-audit-2026-08-16.md) — fourth round, run against the generic
  [53-comprehensive-audit-prompt-playbook.md](53-comprehensive-audit-prompt-playbook.md) instead;
  a different category split surfaced real WCAG contrast-math findings the prior splits hadn't
- [58-audit-2026-08-20.md](58-audit-2026-08-20.md) — fifth round, docs/53 again, focused on the
  newly-shipped Saved Words feature (docs/57); 2 P1s found, **not yet fixed** — start here for the
  most recent state

## Archive

`docs/hold/` — superseded plans and abandoned drafts, kept for historical reference. Nothing
active depends on anything in there.
