# Postgres + Vercel Migration Plan

Written before any code, per the same discipline as [17](17-custom-chapter-quiz-plan.md)/
[18](18-quiz-runner-and-picker-improvements-plan.md)/[19](19-meaning-quiz-mode-plan.md).

**Status: migration done, verified end-to-end against a real Neon database.** Two things
changed from the plan below once real numbers came in — see "What actually happened" at the
end. `docs/21-vercel-deploy.md` (the actual Vercel deploy steps) is still to come, once the
user is ready to go through Vercel's own signup/connect flow.

## Context

[16-deploy.md](16-deploy.md) picked Render specifically because the app used `better-sqlite3`
against a local SQLite file, which needs a persistent disk and a long-running process — a
serverless platform like Vercel can't provide that (ephemeral filesystem between invocations).
The user has now decided to actually do the migration to get onto Vercel's free tier instead of
Render's $7/mo flat fee: swap SQLite for a hosted Postgres (Neon, free tier), which removes the
persistent-disk requirement entirely and makes serverless hosting work.

## Why this is safe to do now

The schema is fully relational already (`prisma/schema.prisma`) — Postgres is a strictly better
fit for it than SQLite ever was, not a compromise. The data itself is small (current `dev.db` is
~200KB) and every vocab table is fully reseedable from source (`prisma/seed.ts`, idempotent,
already re-run safely many times per [07-roadmap.md](07-roadmap.md)'s history) — only `User`/
`Session`/`Attempt`/`Friendship` rows are real, irreplaceable data, and there's no production
data yet to migrate (nothing has been deployed live).

## The Prisma 7 driver-adapter split (why this is two separate changes, not one)

This app already has two independent places a database URL matters, which is *why* the previous
SQLite→anything swap was flagged as "swap the adapter, not just the schema" back in
[16-deploy.md](16-deploy.md):

1. **`prisma.config.ts`** — supplies `DATABASE_URL` to the Prisma *CLI* (`migrate dev`, `migrate
   deploy`, `studio`). This is why `prisma/schema.prisma`'s `datasource` block has never needed
   its own `url` — the CLI gets it from here instead.
2. **`src/lib/db.ts`** — the *application's* `PrismaClient` is constructed with an explicit
   driver adapter (`PrismaBetterSqlite3` today), completely separate from what the CLI uses.

Both need to point at Postgres for this migration; neither one alone is enough.

## Decisions

- **Adapter: `@prisma/adapter-neon`** (over generic `@prisma/adapter-pg`). Neon's adapter talks
  to Postgres over HTTP/WebSockets via `@neondatabase/serverless` instead of a pooled TCP
  connection — the right fit for Vercel specifically, where many short-lived serverless function
  instances opening traditional TCP connections against a small free-tier Postgres is a known
  pain point. `@prisma/adapter-pg` would work as a fallback but has none of that serverless-aware
  behavior.
- **One `DATABASE_URL`, Neon's default pooled connection string**, used by both `prisma.config.ts`
  and `src/lib/db.ts`. Not splitting into a separate `DIRECT_URL` for migrations unless that
  turns out to actually be necessary in practice — Neon's pooler has historically been fine for
  `prisma migrate` too; adding a second env var pre-emptively for a problem that may not occur is
  unneeded complexity.
- **Migrations reset, not converted.** The existing `prisma/migrations/*` SQL files are SQLite
  syntax (`AUTOINCREMENT`, SQLite type affinities) — not valid Postgres SQL. Since there's no
  live production data anywhere yet, the plan is: delete the existing migration history, then run
  one fresh `prisma migrate dev --name init` against a real reachable Postgres URL once one
  exists, generating a correct Postgres-flavored initial migration from the current schema.
  Mirrors exactly what already happened once before in this repo's history (the dev SQLite DB was
  reset rather than migrated when the `slug` column was added, since everything was reseedable —
  see [07-roadmap.md](07-roadmap.md)).
- **Local dev also moves to Postgres** — there's no more SQLite fallback once `better-sqlite3` is
  removed, so local development needs its own reachable Postgres too. Recommended: a second Neon
  **branch** (Neon's free tier supports branching a database) used only for local dev, kept
  separate from the prod branch Vercel points at — avoids needing a local Postgres install
  (Docker etc.) while keeping dev/prod data genuinely separate, the same separation the old
  `dev.db` vs. Render's `prod.db` already had.
- **Seed step folded into the build command**, not a separate manual step — `prisma migrate
  deploy && tsx prisma/seed.ts && next build`, same pattern Render's `startCommand` already used
  successfully. Idempotent, safe to run on every deploy; Vercel installs devDependencies (`tsx`)
  during build by default so this needs no extra config.
- **Render's setup (`render.yaml`, [16-deploy.md](16-deploy.md)) was originally planned to stay
  in place, not deleted** — the reasoning at the time being that once Postgres removed the
  persistent-disk requirement, the same app could deploy to *either* host with no further
  changes, so there was no reason to throw away working config for an option that was still
  valid. **Reversed in a later follow-up**: `render.yaml` was actually deleted once Vercel became
  the real, committed-to target — an unused deploy config was judged more likely to confuse later
  ("wait, which one do we actually use?") than to ever get redeployed. `docs/16-deploy.md` itself
  was kept, marked explicitly as a historical record rather than live config.

## Package changes

Remove: `better-sqlite3`, `@prisma/adapter-better-sqlite3`.
Add: `@prisma/adapter-neon`, `@neondatabase/serverless`.

## File-by-file changes

- **`prisma/schema.prisma`**: `datasource db { provider = "sqlite" }` →
  `datasource db { provider = "postgresql" }`. No `url` line needed here either, per the
  driver-adapter split above.
- **`src/lib/db.ts`**: swap `PrismaBetterSqlite3` for `PrismaNeon` (`@prisma/adapter-neon`),
  constructed from `process.env.DATABASE_URL`. Update the file's own comment (currently says
  "SQLite is dev/test-only... swapping to Postgres in prod means swapping this adapter" — that
  swap is what's happening now, comment should reflect the new state, not describe the old one
  as still-future).
- **`prisma.config.ts`**: unchanged — already reads `DATABASE_URL` from env generically, works
  for a Postgres connection string exactly as it did for the SQLite one.
- **`prisma/migrations/`**: delete existing folders; regenerate fresh against Postgres (see
  Decisions above). Requires a live `DATABASE_URL` at the time this runs — can't be done until
  the user has an actual Neon connection string.
- **`.env` / `.env.example`**: `DATABASE_URL="file:./dev.db"` → a real
  `postgresql://...` connection string (`.env.example` gets a placeholder shape, not a real
  secret).
- **`package.json`**: dependency swap above; `build` script becomes `prisma migrate deploy && tsx
  prisma/seed.ts && next build --webpack` (keeping the existing `--webpack` flag from
  [16-deploy.md](16-deploy.md)'s local-machine fix — still needed on this dev machine, harmless
  elsewhere).
- **New `docs/21-vercel-deploy.md`**: the Vercel-side equivalent of
  [16-deploy.md](16-deploy.md) — how to actually deploy once the code changes above are in place
  (connect the GitHub repo on vercel.com, set `DATABASE_URL` in project env vars, deploy). Written
  once the migration itself is done and verified, not before — same "plan first, but the deploy
  doc reflects the real working state" approach 16 followed.

## What only the user can do (I can't provision cloud accounts)

1. Sign up at neon.tech (free tier), create a project, and create two branches (or two separate
   small projects) — one for local dev, one for prod.
2. Hand me the **dev** branch's connection string (via `.env`, not pasted in chat) so I can run
   the migration reset, verify the app actually works against real Postgres, and run the seed
   script.
3. Once verified, sign up at vercel.com, connect the GitHub repo, and set `DATABASE_URL` in the
   Vercel project's env vars to the **prod** branch's connection string before the first deploy.

## Verification

- `npx prisma migrate dev --name init` succeeds against the dev Neon branch, produces a
  Postgres-flavored migration.
- `npm run db:seed` populates it; spot-check via `prisma studio` or a throwaway query that levels/
  chapters/words look right.
- Full app smoke test against the new Postgres backend, same shape as every previous feature's
  verification pass in this repo: register, log in, take a quiz in each mode (typing, matching,
  choice), submit an attempt, check the leaderboard, add a friend.
- `npm run build` (now including `prisma migrate deploy` in the build script) succeeds locally
  against the dev database before ever touching Vercel.
- `tsc --noEmit` / `eslint` clean, as always.

## What actually happened (differs from the plan above)

- **Seed pulled back out of the build command.** The plan assumed folding `tsx prisma/seed.ts`
  into `build` would be as harmless as it was for Render — true for SQLite (sub-millisecond
  local queries) but not for Neon: `seed.ts` does one `find` + `upsert` per word, sequentially,
  and each of those ~1,500 words is now a separate network round-trip. The actual first seed run
  against Neon took several minutes rather than a couple seconds. Re-running that on *every*
  future deploy for data that essentially never changes was pure waste (and a real risk of
  blowing past Vercel's build time budget for no reason), so `build` is back to just `prisma
  migrate deploy && next build --webpack` — `npm run db:seed` stays a manual step, run only when
  vocab source data actually changes. A future pass could rewrite `seed.ts` to batch its writes
  (e.g. `createMany`/fewer round trips) if this becomes annoying enough to fix properly; not done
  here since it's a one-time-per-content-change cost either way.
- **Single Neon database, not two branches.** There's no live production data or real users yet,
  so the user reasonably decided the dev/prod branch split wasn't worth the setup friction right
  now — one Neon project (created via Vercel's marketplace integration, which also means
  `DATABASE_URL` gets auto-wired into the Vercel project's env vars once deployed, one less manual
  step) serves both local dev and will serve prod. Revisit with a real branch split once the site
  has actual users, per the same reasoning as the original plan.
