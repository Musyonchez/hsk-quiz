# HSK Quiz Site

A Sporcle-style typing quiz for HSK 1-3 vocabulary, fully self-contained in this repo. See
[`docs/`](docs/01-overview.md) for the full spec — start at
[`docs/01-overview.md`](docs/01-overview.md).

## Getting started

```bash
npm install          # also runs `prisma generate` via postinstall
npm run db:migrate    # apply Prisma migrations to the Postgres database DATABASE_URL points at
npm run db:seed       # seed the DB from the in-repo src/lib/extract/hsk*-data.ts files
npm run dev            # http://localhost:3000
```

Requires a `DATABASE_URL` env var pointing at a Postgres database (dev and prod share the same
Neon database today — see [`docs/05-architecture.md`](docs/05-architecture.md)).

Other scripts: `npm run db:studio` (browse the database), `npm run lint`,
`npm run build`.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma 7 + Postgres (Neon, via
`@prisma/adapter-neon`) — see [`docs/05-architecture.md`](docs/05-architecture.md).
