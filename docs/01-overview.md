# Website — Overview

## What this is

A Sporcle-style typing quiz site for HSK vocabulary — HSK1/HSK2 sourced from
[characters/words/](../../characters/words/), HSK3 and up sourced from an in-repo data file per
level (see [02-data-sources.md](02-data-sources.md) for why), and the raw HSK vocabulary lists
in [raw/](../../raw/) for the combined-level word lists. Modeled directly on the screenshots
supplied for this feature:
a results screen, a browsable answer-key table, and a timed typing quiz where you type the
pinyin for each Chinese word and the row highlights as you go.

## Scope

Two granularities per level:

1. **Individual chapter quizzes** — one quiz per chapter, built from that chapter's
   `vocabulary.md` for HSK1/HSK2, or an in-repo data file for HSK3 and up (see
   [02-data-sources.md](02-data-sources.md)).
2. **Combined level quizzes** — one quiz per HSK level, built from the official all-levels PDF
   for HSK1-3, or that book's own transcribed textbook appendix for HSK4 and up (each of
   HSK4-6 is published as two separate volumes, so the cumulative PDF doesn't apply past HSK3 —
   see [02-data-sources.md](02-data-sources.md)).

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

## Why two data sources instead of one

The per-chapter `vocabulary.md` files are hand-curated and richer (scenes, grammar notes,
character notes), but per explicit instruction no new content was added under
`characters/words/` past HSK2 — so they only exist for HSK1/HSK2 chapters. The combined-level
view needs the *complete* official word list per level, which for HSK1-3 only exists in the raw
PDFs — the chapter files alone don't necessarily add up to the full HSK list. So:

- HSK1/HSK2 chapter quizzes read from `characters/words/hsk{1,2}/chapter*/vocabulary.md`.
- HSK3+ chapter quizzes read from an in-repo TypeScript data file instead (no `vocabulary.md`
  involved at all — see [02-data-sources.md](02-data-sources.md)).
- HSK1-3 combined quizzes read from `raw/HSK-All-Levels-Vocabulary/.../HSK {N} Vocabulary
  list.pdf`; HSK4+ read from an in-repo data file the same way their chapters do, since each
  book is published as its own volume the cumulative PDF doesn't cover.

See [02-data-sources.md](02-data-sources.md) for the extraction rules for each.

## Document index

- [02-data-sources.md](02-data-sources.md) — where every piece of quiz data comes from
- [03-content-extraction-rules.md](03-content-extraction-rules.md) — exact rules for what
  counts as quizzable vocabulary from a `vocabulary.md` file
- [04-data-pipeline.md](04-data-pipeline.md) — the seed step that loads source files into the
  database
- [05-architecture.md](05-architecture.md) — folder layout, tech stack, and database setup for
  the site itself
- [06-quiz-mechanics.md](06-quiz-mechanics.md) — the quiz screen's interaction spec, matched to
  the reference screenshots
- [07-roadmap.md](07-roadmap.md) — implementation phases
- [08-ui-ux.md](08-ui-ux.md) — visual design system: layout, color, type, components
- [09-pages.md](09-pages.md) — full sitemap: every page in the site, not just the quiz
