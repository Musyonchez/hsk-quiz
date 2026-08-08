# Deploying hsk-quiz (Render) — superseded

**This is a historical record, not the current deploy path.** The app was originally hosted on
Render because it used SQLite (`better-sqlite3`), which needs a persistent disk and a
long-running process — not something a serverless platform like Vercel can provide.
[20-postgres-vercel-migration-plan.md](hold/20-postgres-vercel-migration-plan.md) later migrated the
database to Postgres (Neon) specifically to move onto Vercel instead, which removed the
persistent-disk requirement entirely. `render.yaml` has been **deleted** — Vercel is now the
live target; see [21-vercel-deploy.md](21-vercel-deploy.md) (once written) for that flow.

## Why Render (at the time)

- The app used `better-sqlite3` via Prisma for a SQLite file on disk, plus real user accounts/
  sessions/quiz attempts. That needed a host with a **persistent filesystem** and a **long-running
  Node process** — Vercel's ephemeral filesystem couldn't provide that without first migrating
  off SQLite, which is exactly what [20](hold/20-postgres-vercel-migration-plan.md) did.
- Render's Starter plan was a **flat monthly fee** ($7/mo), not usage-metered like Railway's
  Hobby plan — predictable billing was the deciding factor over other hosts at the time.

## What the old `render.yaml` did, for reference

Defined a Render "Blueprint" web service, `npm install && npm run build` as the build command
(with `npm run build` folding in `prisma migrate deploy`), `npm start` to run it, `DATABASE_URL`
set manually in Render's dashboard (`sync: false`, never committed), and no persistent disk (that
requirement was already gone by the time the file was deleted — it dropped out once the database
moved to Postgres, before the file itself was removed).

## If Render ever comes back into consideration

Nothing about the current Postgres-backed app is Render-specific — it would deploy there just as
easily as on Vercel, since neither the persistent-disk requirement nor any Render-only feature is
in play anymore. Recreating `render.yaml` would just mean redoing the Blueprint setup described
above; no code changes needed.
