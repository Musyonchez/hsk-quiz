# HSK Quiz

A study site for HSK 1-3 Chinese vocabulary — type the pinyin, match the meaning, or recall the
character itself, by chapter, by full level, or across levels in a custom mix. Fully
self-contained: one Next.js app, one Postgres database, real accounts with friends and
leaderboards. See [`docs/`](docs/01-overview.md) for the full spec — start at
[`docs/01-overview.md`](docs/01-overview.md), which covers the site through `docs/10` and
`docs/16`/`docs/21` (deploy). Everything past that is a dated, incremental plan for one
feature/fix/audit — a running design log rather than something rewritten in place — archived
under [`docs/hold/`](docs/hold/) once superseded, to keep the top-level folder short.

## Features

- **Three quiz modes** per chapter/level: type the pinyin from memory (tone marks optional),
  match meanings (click-to-pair at chapter scale, multiple-choice at combined/custom scale), or
  recall the Chinese character itself via a virtual pinyin-candidate picker.
- **Optional Hard mode** — hides a second answer column instead of just one, for a harder recall
  challenge on top of any mode.
- **Chapter dialogs** — each chapter's actual textbook conversation as its own tab, plus quizzes
  on the full vocabulary it uses (not just the words officially called out as "new").
- **Chapter, Combined, or fully Custom** — drill one chapter, cram a whole level, or mix any
  chapters across HSK levels into your own quiz.
- **Accounts, leaderboards, friends** — every tracked quiz has a global and a friends-only
  leaderboard; self-service registration, no email required.

## Getting started

```bash
npm install           # also runs `prisma generate` via postinstall
npm run db:migrate    # apply Prisma migrations to the Postgres database DATABASE_URL points at
npm run db:seed       # seed the DB from the in-repo src/lib/extract/hsk*-data.ts files
npm run dev           # http://localhost:3000
```

Requires a `DATABASE_URL` env var pointing at a Postgres database (dev and prod share the same
Neon database today — see [`docs/05-architecture.md`](docs/05-architecture.md)).

Other scripts: `npm run db:studio` (browse the database), `npm run lint`, `npm run
db:migrate:deploy` (apply a hand-written migration file without the interactive prompts
`db:migrate` needs). `npm run build` only applies migrations on a real Vercel Production deploy
(`VERCEL_ENV === "production"`, checked in `scripts/maybe-migrate.mjs`) — run
`db:migrate:deploy` yourself first if you need a fresh migration applied locally before
building; see [`docs/35-ci-cd-plan.md`](docs/35-ci-cd-plan.md) for why Preview builds skip it.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma 7 + Postgres (Neon, via
`@prisma/adapter-neon`) — see [`docs/05-architecture.md`](docs/05-architecture.md).

## Contributing / workflow

`main` is branch-protected — every change lands via a pull request, no direct pushes (this
applies to admins too). The usual flow:

```bash
git checkout -b your-branch-name
# commit, then:
git push -u origin your-branch-name
gh pr create
gh pr merge --merge --delete-branch
git checkout main && git pull
```

<!-- test/verify-preview-deploy: throwaway commit to confirm Vercel preview builds work again after the Neon Production-only reconnect -->
