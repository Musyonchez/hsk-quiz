# Website — Overview

## What this is

A Sporcle-style typing quiz site for HSK vocabulary. **Fully self-contained**: every level's
word list — chapter-scoped and combined — lives entirely inside this repo as plain TypeScript
data (`src/lib/extract/hsk{N}-chapters-data.ts` and `hsk{N}-combined-data.ts`), not read from an
external `characters/words/` or `raw/` folder at runtime or seed time (those don't exist in this
repo at all — see [04-data-pipeline.md](04-data-pipeline.md) for the seed step, and
[hold/02-data-sources.md](hold/02-data-sources.md) for the historical, one-time extraction that
originally produced this data, back when it *did* read from external PDF/markdown sources).
Modeled directly on the screenshots supplied for this feature: a results screen, a browsable
answer-key table, and a timed typing quiz where you type the pinyin for each Chinese word and the
row highlights as you go.

## Scope

Two granularities per level, both sourced the same way (in-repo TypeScript data, per
[04-data-pipeline.md](04-data-pipeline.md)):

1. **Individual chapter quizzes** — one quiz per chapter.
2. **Combined level quizzes** — one quiz per HSK level, the complete official word list for
   that level.

Currently live on the site: HSK1-3. HSK4A/4B are fully transcribed but not yet wired in, and
HSK5A/5B/6A/6B are still pending their own transcriptions — see
[07-roadmap.md](07-roadmap.md)'s "HSK4+ paused" entry for the current state and why.

## Self-sufficient app, not a static site

This is a real client/server app with its own database, not a pile of static JSON files:

- **Both dev and prod**: a single external managed database (Neon Postgres), reached via one
  `DATABASE_URL` — no SQLite, no separate dev/prod database split (see
  [05-architecture.md](05-architecture.md) for what that tradeoff means in practice, and
  [45-audit-infra-security.md](45-audit-infra-security.md) for the risk it carries).

This also means quiz attempts and best scores can be genuinely persisted server-side (not just
`localStorage`), so "your progress" survives clearing browser storage or switching devices —
tied to your account, per the login section below.

## Accounts and social features (in scope)

Reversing the earlier draft's "no accounts" stance: the site has real login, and the
reference screenshots' `AVG SCORE` / `AVG FRIEND SCORE` / leaderboard-style features are
reproduced, not skipped:

- **Login is account-based, with public self-service registration.** Anyone can create an
  account from `/register` (username + password + email — the email exists solely to support
  password reset, see [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md)) —
  see [05-architecture.md](05-architecture.md) for how accounts get created and
  [09-pages.md](09-pages.md) for the login/register pages themselves.
- **Friends** — a user can add another known user as a friend; friend status gates what shows
  up on the friends leaderboard.
- **Leaderboard** — per-quiz global leaderboard (all users) and a friends-only view, both
  ranked by best score.

## Non-goals (for now)

- No mobile app — a responsive web page is enough.

(Previously this section also listed "no email collection or forgot-password flow" as a
non-goal — reversed by [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md):
registration collects an email specifically to support a real forgot-password flow now.

It also listed "no listening/audio component" — reversed by
[47-word-sentence-audio-plan.md](47-word-sentence-audio-plan.md): every word and dialog sentence
now has a speaker-icon pronunciation button, via pre-generated TTS audio files rather than a live
listening-quiz mode. The [hsk2-listening-plan](../../hsk2-listening-plan/plan.md) this line used
to point at describes a different, still-unbuilt listening *quiz* mode — that part of the
non-goal still stands; only the "no audio at all" framing was wrong.)

## Why "two data sources" used to matter (historical)

Before the self-containment pass, chapter and combined word lists genuinely came from two
different kinds of external source — hand-curated `vocabulary.md` files for HSK1/HSK2 chapters
(richer: scenes, grammar notes, character notes) versus raw official-vocabulary-list PDFs for the
combined level view, since the chapter files alone didn't add up to a level's full official word
list. That distinction no longer has any bearing on how the site actually works today — both
granularities, every level, now read from the same kind of source (in-repo TypeScript data, per
[04-data-pipeline.md](04-data-pipeline.md)). See
[hold/02-data-sources.md](hold/02-data-sources.md) and
[hold/03-content-extraction-rules.md](hold/03-content-extraction-rules.md) for exactly where each
level's data originally came from and how it was extracted, if that history matters for a future
correction — both are archived (`docs/hold/`) since the pipeline they describe no longer runs.

## Document index

- [04-data-pipeline.md](04-data-pipeline.md) — the seed step that loads source files into the
  database (its historical predecessors, [hold/02](hold/02-data-sources.md) and
  [hold/03](hold/03-content-extraction-rules.md), cover where the data originally came from)
- [05-architecture.md](05-architecture.md) — folder layout, tech stack, and database setup for
  the site itself
- [06-quiz-mechanics.md](06-quiz-mechanics.md) — the quiz screen's interaction spec, matched to
  the reference screenshots
- [07-roadmap.md](07-roadmap.md) — implementation phases
- [08-ui-ux.md](08-ui-ux.md) — visual design system: layout, color, type, components
- [09-pages.md](09-pages.md) — full sitemap: every page in the site, not just the quiz
