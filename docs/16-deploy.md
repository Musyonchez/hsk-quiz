# Deploying hsk-quiz (Render)

**Note**: this doc was originally written when the app used SQLite (hence Render specifically —
see "Why Render" below for that original reasoning). [20-postgres-vercel-migration-plan.md](20-postgres-vercel-migration-plan.md)
later migrated the database to Postgres (Neon), which removed the persistent-disk requirement
entirely — Render is no longer the *only* option that works, just one that still does. See
[21-vercel-deploy.md](21-vercel-deploy.md) (once written) for the Vercel alternative.

Hosted on [Render](https://render.com), Starter plan ($7/mo flat, no usage metering).

## Why Render (original reasoning, from when this was SQLite-only)

- The app used `better-sqlite3` via Prisma for a SQLite file on disk, plus real user accounts/
  sessions/quiz attempts. That needed a host with a **persistent filesystem** and a **long-running
  Node process** — not a serverless platform like Vercel (ephemeral filesystem) without first
  migrating off SQLite, which is exactly what [20](20-postgres-vercel-migration-plan.md) later did.
- Render's Starter plan is a **flat monthly fee**, not usage-metered like Railway's Hobby plan —
  predictable billing. This part still holds regardless of database choice.

## What changed in this repo

- `render.yaml` — Render "Blueprint" config: defines the web service and build/start commands.
  No longer defines a persistent disk (removed once the database moved to Postgres — nothing
  local left to persist).
- `.env.example` — documents the `DATABASE_URL` env var (now a Postgres connection string, not a
  SQLite file path).
- `package.json` — added `engines.node` pin (`>=22`) so Render provisions a compatible Node
  runtime.

## Deploy flow

On every deploy, Render runs:

1. `npm install && npm run build` — `postinstall` runs `prisma generate`, and `build` itself now
   includes `prisma migrate deploy` (see `package.json`), applying any pending migrations against
   the Postgres database.
2. `npm start`.

Seeding (`npm run db:seed`) is **not** run automatically on deploy — per
[20](20-postgres-vercel-migration-plan.md)'s "what actually happened," the seed script's
one-row-at-a-time writes are slow over a real network database and vocab data essentially never
changes between deploys. Run it manually (locally, pointed at the production `DATABASE_URL`, or
via Render's shell) only when vocab source data actually changes.

## One-time manual setup (do this in the Render dashboard)

1. Sign up at render.com and connect your GitHub account.
2. New → Blueprint → select the `Musyonchez/hsk-quiz` repo. Render will read `render.yaml`
   automatically and provision the web service.
3. Confirm the plan is **Starter** (not Free — Free tier sleeps after 15 min idle) before the
   first deploy.
4. Set `DATABASE_URL` in the Render dashboard's environment variables to the Neon Postgres
   connection string (`render.yaml` deliberately doesn't commit this value — `sync: false` marks
   it as "set manually," since it's a real credential).
5. Deploy.

## Verifying a deploy worked

- Visit the live URL, register a test account, log in, take a quiz, confirm the attempt is
  recorded.
- Confirm the vocab data is actually there (levels/chapters/words) — if this is the very first
  deploy against a fresh Postgres database, run `npm run db:seed` once, manually, before or after
  this check (see "Deploy flow" above — it's not automatic).
