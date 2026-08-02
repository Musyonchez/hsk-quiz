# Deploying hsk-quiz

Hosted on [Render](https://render.com), Starter plan ($7/mo flat, no usage metering), keeping the existing SQLite database as-is (no migration to Postgres/Mongo needed — this app's data is small and fully relational, well under a few MB even with real users).

## Why Render

- The app uses `better-sqlite3` via Prisma for a SQLite file on disk, plus real user accounts/sessions/quiz attempts. That needs a host with a **persistent filesystem** and a **long-running Node process** — not a serverless platform like Vercel (ephemeral filesystem) without first migrating off SQLite.
- Render's Starter plan is a **flat monthly fee**, not usage-metered like Railway's Hobby plan — predictable billing.

## What changed in this repo

- `render.yaml` — Render "Blueprint" config: defines the web service, build/start commands, and a persistent disk.
- `.env.example` — documents the `DATABASE_URL` env var.
- `package.json` — added `engines.node` pin (`>=22`) so Render provisions a compatible Node runtime.

## Key detail: absolute DB path

`src/lib/db.ts` passes `DATABASE_URL` straight to the `better-sqlite3` Prisma adapter, which resolves `file:./dev.db`-style paths **relative to the process's working directory at runtime**, not the repo root. In production this must be an **absolute path on the mounted persistent disk**, or the database won't survive redeploys/restarts. That's why `render.yaml` sets:

```
DATABASE_URL=file:/var/data/prod.db
```

pointing at the disk mounted at `/var/data`.

## Deploy flow

On every deploy, Render runs:

1. `npm install && npm run build` (build step; `postinstall` already runs `prisma generate`)
2. `npx prisma migrate deploy && npx tsx prisma/seed.ts && npm start` (start command) — applies any pending migrations, re-runs the idempotent seed script (`prisma/seed.ts`, safe to rerun — it upserts levels/words and cleans up stale rows), then starts the server.

## One-time manual setup (do this in the Render dashboard)

1. Sign up at render.com and connect your GitHub account.
2. New → Blueprint → select the `Musyonchez/hsk-quiz` repo. Render will read `render.yaml` automatically and provision the web service + disk.
3. Confirm the plan is **Starter** (not Free — Free tier sleeps after 15 min idle) before the first deploy.
4. Deploy. First deploy will run migrations + seed against the fresh empty disk.

## Verifying a deploy worked

- Visit the live URL, register a test account, log in, take a quiz, confirm the attempt is recorded.
- Trigger a second deploy (e.g. a trivial commit) and confirm the test user/account still exists — proves the SQLite file is persisting on the disk across deploys, not being reset.
