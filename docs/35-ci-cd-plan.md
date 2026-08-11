# CI/CD: GitHub Actions + Decoupling Migrations from Preview Builds

## What was already in place

`main` is branch-protected (PR-only, admin-enforced, no direct pushes — set up earlier this
project). But there was no actual CI running against a PR beyond that: no GitHub Actions at all,
just Vercel's automatic preview-deploy check and GitGuardian's secret scanning.

## Bug found while investigating

Checking recent PR status checks turned up something worth fixing on its own, not just process
polish: **Vercel's preview-deploy check has been failing on merged PRs** (#10, #11). `DATABASE_URL`
is present for both Production and Preview environments (checked — not an env-var gap), so the
real cause is almost certainly the same `P1002` Postgres advisory-lock timeout this repo has hit
repeatedly all session locally: `npm run build` runs `prisma migrate deploy` against the **one
shared database** every environment uses (per docs/05-architecture.md — "No branch split between
dev/prod yet"). Every Preview deployment (one per PR, and per push to an open PR's branch) runs
that same command against that same database, so it's constantly racing Production's own deploys
and any other in-flight preview build for the same advisory lock. Worse than the flakiness: an
**unreviewed branch's schema migration touches production before the PR is even approved.**

## Fixes

### 1. GitHub Actions CI

A new `.github/workflows/ci.yml`, running on every PR and push to `main`: `npm ci` (which already
runs `prisma generate` via the existing `postinstall` script — no DB connection needed for that),
`tsc --noEmit`, `eslint .`. No database involved at all — this is exactly the check this repo has
been running by hand before every commit all session, now automatic.

Added to branch protection as a required status check **after** it's run at least once on a real
PR — GitHub won't let a context be required before it exists, and guessing the exact check-name
string ahead of time risks permanently blocking merges on a name that never matches.

### 2. Migrations gated to Production deploys only

**Confirmed explicitly.** `prisma migrate deploy` now only runs when `VERCEL_ENV === "production"`
(a var Vercel sets automatically, no project-config change needed) — via a small
`scripts/maybe-migrate.mjs` wrapper the `build` script calls before `next build`. Preview
deployments just build against whatever schema already exists; migrations run exactly once,
deliberately, the moment a merge actually reaches production.

**Local-build side effect**: `npm run build` locally no longer applies migrations either (no
`VERCEL_ENV` set outside Vercel) — previously this repo's own workflow (including this session's)
leaned on `npm run build` to apply a freshly hand-written migration file locally. That's now a
separate, explicit step: `npm run db:migrate:deploy` (new script, `prisma migrate deploy`) before
building, when a migration needs applying by hand in this non-interactive environment (`prisma
migrate dev` needs a real interactive terminal, which is why this repo has hand-written every
migration SQL file so far rather than generating it).

## Files touched

- `.github/workflows/ci.yml` (new).
- `scripts/maybe-migrate.mjs` (new).
- `package.json` — `build` script now calls the wrapper; new `db:migrate:deploy` script.
- `README.md` — local dev flow note on the new explicit migrate step.

## Verification

- Open this as a PR — confirm the new CI check appears and passes.
- Confirm the PR's Vercel preview deploy succeeds now (previously erroring) — check its build log
  shows the migrate step skipped ("not a production deploy") rather than attempting a lock.
- After merge, confirm the production deploy still applies pending migrations (build log shows
  the migrate step actually running).
- Add the CI check as a required status check once its real name is confirmed from the PR run.
