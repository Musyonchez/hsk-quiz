# Website — Overview

## What this is

A Sporcle-style typing quiz site for the vocabulary already built up in
[characters/words/](../../characters/words/) (HSK 1 and HSK 2) and the raw HSK vocabulary
lists in [raw/](../../raw/). Modeled directly on the screenshots supplied for this feature:
a results screen, a browsable answer-key table, and a timed typing quiz where you type the
pinyin for each Chinese word and the row highlights as you go.

## Scope

Two granularities per level:

1. **Individual chapter quizzes** — one quiz per `characters/words/hsk{1,2}/chapter{N}/`,
   built from that chapter's `vocabulary.md`.
2. **Combined level quizzes** — one quiz per HSK level (HSK 1 combined, HSK 2 combined),
   built from `raw/HSK-All-Levels-Vocabulary/HSK All Levels Vocabulary/HSK {1,2} Vocabulary
   list.pdf`.

HSK 3 is out of scope for now — `characters/words/hsk3/` is still empty ([[one-chapter-at-a-time]] applies to that content, unrelated to this build).

## Self-sufficient app, not a static site

This is a real client/server app with its own database, not a pile of static JSON files:

- **Dev/testing**: SQLite, file-based, zero setup.
- **Prod**: an external managed database (Postgres). Swapping is a small, contained change
  (the `schema.prisma` provider plus one driver-adapter import — see
  [05-architecture.md](05-architecture.md)), not a query rewrite — the ORM keeps both targets
  working off one schema either way.

This also means quiz attempts and best scores can be genuinely persisted server-side (not just
`localStorage`), so "your progress" survives clearing browser storage or switching devices —
tied to your account, per the login section below.

## Accounts and social features (in scope)

Reversing the earlier draft's "no accounts" stance: the site has real login, and the
reference screenshots' `AVG SCORE` / `AVG FRIEND SCORE` / leaderboard-style features are
reproduced, not skipped:

- **Login is account-based, not open self-signup.** Accounts are provisioned for specific
  known users (you and whoever you invite) rather than a public "create an account" flow —
  see [05-architecture.md](05-architecture.md) for how accounts get created and
  [09-pages.md](09-pages.md) for the login page itself.
- **Friends** — a user can add another known user as a friend; friend status gates what shows
  up on the friends leaderboard.
- **Leaderboard** — per-quiz global leaderboard (all users) and a friends-only view, both
  ranked by best score.

## Non-goals (for now)

- No listening/audio component (separate from [hsk2-listening-plan](../../hsk2-listening-plan/plan.md)).
- No public self-service signup — see above, accounts are provisioned, not open registration.
- No mobile app — a responsive web page is enough.

## Why two data sources instead of one

The per-chapter `vocabulary.md` files are hand-curated and richer (scenes, grammar notes,
character notes) but only exist for HSK 1 and HSK 2 chapters. The combined-level view needs
the *complete* official word list per level, which only exists in the raw PDFs — the chapter
files alone don't necessarily add up to the full HSK list. So:

- Chapter quizzes read from `characters/words/hsk*/chapter*/vocabulary.md`.
- Combined quizzes read from `raw/HSK-All-Levels-Vocabulary/.../HSK {N} Vocabulary list.pdf`.

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
