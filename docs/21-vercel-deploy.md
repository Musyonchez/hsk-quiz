# Deploying hsk-quiz (Vercel)

The live deploy target, per [20-postgres-vercel-migration-plan.md](hold/20-postgres-vercel-migration-plan.md) — the database moved from SQLite to Postgres (Neon) specifically to make this possible. See [16-deploy.md](16-deploy.md) for the superseded Render setup.

## Why this works now

Vercel's serverless functions have an ephemeral filesystem between invocations — that's what
ruled it out originally, back when the app used a local SQLite file. With the database on Neon
Postgres instead, there's nothing local left to persist, so a stateless serverless host works
fine.

## Env vars

**Corrected per [43-audit-docs-consistency.md](43-audit-docs-consistency.md)** — this section
originally said "just `DATABASE_URL`," which predates
[36-better-auth-migration-plan.md](36-better-auth-migration-plan.md) adding four more required
vars, and [45-audit-infra-security.md](45-audit-infra-security.md)'s `RateLimit`-purge fix adding a
sixth. Six total, though only `CRON_SECRET` is Production-only (see below):

- `DATABASE_URL` — the same Neon connection string already used for local dev (a single database
  serves both right now, per [20](hold/20-postgres-vercel-migration-plan.md)'s "what actually
  happened").
- `BETTER_AUTH_SECRET` — session/token signing secret for the self-hosted better-auth instance.
- `BETTER_AUTH_URL` — the app's own base URL, used for auth callback/redirect origin-checking.
  Docs/36 gates this per `VERCEL_ENV`: a stable value on Production, `https://${VERCEL_URL}`
  (the deployment-specific hash domain) on Preview, since every Preview deployment gets its own
  unique URL and a mismatched `baseURL` actively breaks callback routes, not just warns.
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` — the Gmail SMTP account and app password
  `src/lib/send-email.ts` uses to send password-reset emails.
- `CRON_SECRET` — authenticates Vercel Cron's daily call to
  `/api/cron/purge-rate-limits` (`vercel.json`); Vercel injects it as an
  `Authorization: Bearer` header automatically once set. Vercel Cron only ever triggers against the
  **Production** deployment, so this one only strictly needs setting there — Preview builds never
  receive a cron invocation regardless.

No `NODE_ENV` needed — Vercel sets that automatically for production deployments (Render
required it manually).

If the Neon database was created via **Vercel's own marketplace integration** (Storage tab →
Neon), connecting that existing resource to this project auto-injects `DATABASE_URL` (and a
handful of other `POSTGRES_*`/`PG*` vars this app doesn't use) into the project's environment
variables — no manual copy-paste needed. Only add it manually if that connection wasn't already
made.

## Deploy flow

Vercel runs `npm install` then `npm run build` by default for a detected Next.js project — no
custom build command needed. `npm run build` chains `node scripts/maybe-migrate.mjs && next build
--webpack` (see `package.json`) — pending migrations apply automatically, but **only on a real
Production deploy** (`VERCEL_ENV === "production"`, per
[35-ci-cd-plan.md](35-ci-cd-plan.md)). Every Preview deployment (one per PR, and per push to an
open PR's branch) skips that step and just builds against the schema that already exists —
before this, every preview build ran the same migrate command against the one shared database
every environment uses, which meant preview builds constantly raced Production's own deploys for
the same Postgres advisory lock, and an unreviewed branch's migration could touch production
before its PR was even approved.

Seeding is **not** automatic here either, same reasoning as the Render setup — see
[20](hold/20-postgres-vercel-migration-plan.md)'s "what actually happened." Not a concern for the
first deploy specifically, though: the shared dev/prod Neon database already has all the vocab
data seeded from the migration work itself. Only re-run `npm run db:seed` manually if vocab
source data changes later.

## One-time manual setup (do this on vercel.com)

1. Sign up / log in at vercel.com, connect your GitHub account if not already connected.
2. Add New → Project → import `Musyonchez/hsk-quiz`. Vercel auto-detects Next.js; no framework
   settings need changing.
3. Before the first deploy, confirm all six env vars from "Env vars" above are set in the
   project's Environment Variables (Settings → Environment Variables) — `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` for both Production
   and Preview, `CRON_SECRET` for Production only. `DATABASE_URL` may already be there via the
   Neon integration; the rest need adding manually.
4. Deploy.

## Verifying a deploy worked

- Visit the live URL, confirm the landing page and level hub actually show real chapter/word
  data (not empty) — proves the shared Neon database's existing seed data is reachable.
- Register a test account, log in, take a quiz in each mode (typing, matching, choice), confirm
  the attempt is recorded and shows up on the leaderboard.
- Trigger a second deploy (e.g. a trivial commit) and confirm the test account still exists —
  proves nothing about Vercel's stateless deploys is wiping the (external, Postgres-backed) data,
  the same guarantee the old disk-based Render check was verifying, just via a different
  mechanism this time.
