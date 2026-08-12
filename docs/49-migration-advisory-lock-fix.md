# Fixing recurring P1002 advisory-lock timeouts on Production deploys

## What happened

Two Production deploys failed back-to-back (~15 minutes apart, both from PRs merging in quick
succession) with:

```
Error: P1002
The database server was reached but timed out.
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)).
Timeout: 10000ms.
```

`scripts/maybe-migrate.mjs`'s own comment already documented this exact failure class as
something the Preview-only migration gating (docs/35) was meant to prevent — but Production-only
gating doesn't help when multiple Production deploys land close together, which is what happened
here.

## Two separate things were going on, both real

1. **A genuinely stuck session.** Querying `pg_locks`/`pg_stat_activity` directly found PID 1027
   idle-holding the exact advisory lock (`72707369`) migrations need, for 2.5+ minutes — a leaked
   connection from an earlier interrupted build/command, not released cleanly. `pg_terminate_backend`
   cleared it immediately. This alone explains both observed failures.
2. **A separate, real architectural risk, independent of #1.** `DATABASE_URL` points at Neon's
   *pooled* (PgBouncer-style) connection (host has `-pooler`). Prisma Migrate's advisory-lock
   mechanism is session-scoped — a pooled connection doesn't reliably keep one Postgres backend
   session alive for it, which is a documented Prisma+Neon/PgBouncer gotcha independent of whether
   any one lock happens to be stuck at a given moment. This wasn't necessarily the direct cause of
   tonight's two failures, but it's the same class of risk and worth closing regardless.

## Fix

- Immediate: terminated the stuck backend, unblocking migrations right away.
- Structural: `prisma.config.ts`'s `datasource.url` now prefers `DATABASE_URL_UNPOOLED` (falling
  back to `DATABASE_URL` if unset), so `prisma migrate deploy`/`generate`/`studio` all use Neon's
  direct connection instead of the pooled one. The schema-level `directUrl` field Prisma <7 used
  for exactly this purpose is no longer valid in Prisma 7 — schema.prisma no longer accepts it at
  all (moved into this config file instead), which is why the fix lives in `prisma.config.ts`, not
  `schema.prisma`.
- **The running app itself is unaffected** — `src/lib/db.ts`'s `PrismaNeon` adapter reads
  `process.env.DATABASE_URL` directly and never touches `prisma.config.ts`; it also doesn't use a
  traditional pooled TCP connection at all (Neon's HTTP/WebSocket serverless driver), so it was
  never exposed to this specific advisory-lock issue in the first place — only the Prisma CLI's own
  migration tooling was.
- `DATABASE_URL_UNPOOLED` was already present in Vercel's env vars (auto-provided by the Neon
  marketplace integration) — no new secret needed there. Added to `.env`/`.env.example` for local
  parity; documented in docs/21-vercel-deploy.md as recommended-with-fallback, not a strictly
  required var.

## Verification

- Confirmed the derived direct connection string (`ep-hidden-band-avovkell...`, same as
  `DATABASE_URL` minus `-pooler`) actually connects and resolves correctly via
  `prisma migrate status`.
- Confirmed the fallback path (temporarily removing `DATABASE_URL_UNPOOLED` from `.env`) correctly
  falls back to the pooled URL — nothing breaks in an environment that hasn't set the new var.
- Ran the actual production build path locally (`VERCEL_ENV=production node
  scripts/maybe-migrate.mjs`) end-to-end after clearing the stuck lock — completed cleanly,
  correctly reporting "No pending migrations to apply" against the direct connection.
- `tsc --noEmit` + `eslint .` clean (no app code touched, only `prisma.config.ts`).
