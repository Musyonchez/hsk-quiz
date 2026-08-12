# Audit: infrastructure, CI, deploy, security

Part of the [project audit](40-project-audit-overview.md) (Aug 2026). Scope: `.github/workflows/`,
`scripts/`, `package.json`, `next.config.ts`, `prisma.config.ts`, `.env.example`, and a security-
focused re-read of `src/lib/auth.ts`, `rate-limit-storage.ts`, `send-email.ts`.

## 1. Testing — the headline finding

**project-wide.** Zero automated test coverage: no `*.test.ts`/`*.spec.ts` files anywhere, no
test runner in `package.json` (`vitest`/`jest`/`playwright`/`cypress` all absent). CI
(`.github/workflows/ci.yml`) runs exactly `tsc --noEmit` and `eslint .` — nothing else.

Why it matters, concretely: type-checking and linting catch syntax/type errors and style issues,
neither can catch behavioral regressions. This is demonstrated by the repo's own history — #19
("Fix: mobile menu Log out button unresponsive") fixed a pure runtime/DOM-event-bubbling bug that
`tsc`/`eslint` would never flag; its own commit message says "Verified live at a 390px viewport,"
i.e. a human clicked around, and no test was added to stop the same class of regression from
recurring. Every fix and every regression in this project's history is caught the same way. For an
app with real user accounts, sessions, and a leaderboard, this means auth flows, rate limiting, and
scoring logic have zero regression safety net — a future refactor of `LogoutButton`, `auth.ts`, or
the scoring engine could silently break and ship straight to the one shared production database
with nothing catching it first.

**Severity: blocker** (as a process-risk finding, not a bug in itself).

**Still fully open on re-audit** — re-confirmed zero test infrastructure (no `vitest`/`jest`/
`playwright.config`, no `__tests__` dirs, no test script in `package.json`, only transitive
`package-lock.json` mentions). Deliberately held over — too large/undefined-scope for this session's
discretionary fixes.

## 2. Shared dev/prod database

**✅ Fixed** — `scripts/confirm-write.ts` now gates `prisma/seed.ts` and `backfill-mnemonics.ts`
(requires typed "yes" interactively, or `--yes`/`CONFIRM_WRITE=1` non-interactively, before any
write runs). `prisma studio`/`prisma migrate dev` are unchanged (better-auth/Prisma's own tools, out
of scope for a custom guard) — this closes the two homegrown scripts' accidental-run risk
specifically, not the broader shared-DB architecture itself.

Confirmed still true, per docs/05 and docs/21: one Neon Postgres database serves local dev and
production alike via a single `DATABASE_URL`, no branch/environment split.

Concrete risks this creates:
- `npm run db:migrate` (`prisma migrate dev`) only ever runs against the live production database
  — no throwaway/staging copy to rehearse a migration against first.
- `scripts/backfill-mnemonics.ts` and `prisma/seed.ts` are plain `tsx`-invoked scripts with **no
  environment guard at all** — running either from a laptop, at any time, for any reason (including
  a tab-completion accident), writes directly to production rows. `backfill-mnemonics.ts` in
  particular does `updateMany` matched by `chinese` text with no dry-run flag and no confirmation
  prompt.
- `npm run db:studio` (`prisma studio`) opens a live, locally-unauthenticated GUI directly onto
  production data — any local script or browser extension with filesystem/process access
  effectively has admin access to prod.

**Severity: high** — an architectural/process risk the project's own docs already flag as a known
gap ("revisit once there's real production data worth isolating"), but the revisit hasn't happened
and the app now has real user accounts, passwords, and a leaderboard.

## 3. `scripts/maybe-migrate.mjs` — gating logic verified correct

Does exactly what docs/35 and docs/21 claim: runs `prisma migrate deploy` only when
`process.env.VERCEL_ENV === "production"`, no-ops with a clear log line otherwise. Correctly
prevents Preview deployments from racing Production for the Postgres advisory lock or applying
unreviewed migrations to prod — the exact bug this script was written to fix. **No issue found.**

One residual gap, informational only: local `npm run build` also skips migrations (no `VERCEL_ENV`
set outside Vercel), so `db:migrate:deploy` must be run by hand locally before a build that depends
on a new migration. Documented and intentional, relies on developer memory. **Low.**

## 4. CI gaps beyond "no tests"

- **✅ Fixed** — `npm audit --audit-level=high` added as a CI step; confirmed currently passing
  (0 vulnerabilities) on re-audit. **No dependency vulnerability scanning** — no `npm audit` step in CI, no Dependabot/Renovate
  config anywhere in `.github/`. **Medium.**
- CI doesn't run `next build` (by explicit design — Vercel's own preview deploy covers that,
  documented tradeoff). Reasonable, just means a build-only failure surfaces on Vercel's preview
  rather than in the PR's CI status — slightly slower feedback. **Nitpick.**

## 5. Outdated dependencies

Via `npm outdated` (read-only):

| Package | Current | Latest | Note |
|---|---|---|---|
| `typescript` | 5.9.3 | 7.0.2 | Two majors behind. |
| `eslint` | 9.39.5 | 10.8.1 | One major behind. |
| `@types/node` | ~~20.x~~ **✅ `^22`** | 26.2.0 | Fixed — now aligned with `engines.node` and CI's Node 22. Still a couple majors behind latest, low severity. |
| `next` | 16.2.12 | 16.3.0 | Minor behind, low risk. |
| `eslint-config-next` | 16.2.12 | 16.3.0 | Tracks `next`. |
| `react`/`react-dom` | 19.2.4 | 19.2.8 | Patch behind. |
| `lucide-react` | 1.28.0 | 1.31.0 | Minor behind. |
| `tsx` | 4.23.1 | 4.23.12 | Patch behind. |

`@types/node` mismatch vs the required runtime: **medium**. `typescript`/`eslint` majors behind:
**low**. Everything else: **nitpick**.

(`npm audit` itself wasn't run to avoid any chance of a mutating side effect — `npm outdated` was
used as the safer read-only signal, so no CVE data was collected, only version staleness.)

## 6. `send-email.ts` / `auth.ts` — SMTP failure handling

**✅ Fixed** — `.catch((err) => console.error("Failed to send password-reset email:", err))` added
at the `sendResetPassword` call site. User-facing behavior (no feedback, by design) is unchanged;
this only adds server-log visibility for a failed send.

`sendResetPassword` calls `void sendEmail({...})` — deliberately not awaited, to avoid a timing
side-channel revealing whether an email address exists (documented, intentional). But `sendEmail`
has no `.catch()` anywhere in its call chain, and `getTransport().sendMail(...)` can reject (bad
Gmail app-password, Gmail rate-limiting the relay, network blip, DNS failure, revoked app-password
after 2FA changes). A rejected, unhandled promise from a fire-and-forget call is a genuine
unhandled promise rejection.

Concrete risk: if Gmail SMTP fails — which real app-password relays do occasionally — the user
requesting a reset gets no error (by design, for enumeration protection) but also silently never
receives the email, and the failure is logged nowhere (no `console.error`, no monitoring hook). No
retry, no dead-letter, no alerting. Someone genuinely locked out of their account during a
transient Gmail failure gets zero feedback, and no operator is likely to notice either.

**Severity: medium** — silent failure mode, low blast radius (no financial/PII stakes per docs/37)
but concretely breaks account-recovery UX with zero observability.

## 7. Rate limiting — bypass/gap scenarios

**✅ Fixed** — `/sign-up/email` now has its own rule (5 per 60s).

`customRules` in `auth.ts` covers `/sign-in/username`, `/sign-in/email` (3 per 10s), and
`/forget-password` (3 per 60s). **Registration (`/sign-up/email`) has no custom rule**, falling
back to better-auth's global default of `window: 10, max: 100` (confirmed by reading the installed
library source directly) — 100 signups per 10 seconds from the same key is allowed. Low real-world
risk at personal scale, but effectively no throttling on account-creation spam/automation beyond a
generous global default. **Low.**

The `rateLimitStorage` adapter itself was re-checked and is implemented correctly and atomically —
the custom `increment` uses a single `INSERT ... ON CONFLICT` upsert specifically closing the
get-then-set race better-auth's own fallback path warns about. **No bypass found, this part is
clean.**

## 8. Session/cookie security — confirmed correct

Cross-checked against docs/37: session cookies are `httpOnly`, `Secure` (auto-derived from HTTPS
`baseURL`), `SameSite=Lax`; 7-day expiry with rolling 1-day refresh; scrypt password hashing;
`revokeSessionsOnPasswordReset: true`. `next.config.ts` adds `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` as
defense-in-depth. **Solid, no findings.**

**✅ Fixed** — `next.config.ts` now adds a `Content-Security-Policy` header (`default-src 'self'`,
`script-src`/`connect-src` scoped to `'self'`, prod strips `'unsafe-eval'` since only webpack's dev
Fast Refresh needs it, `frame-ancestors 'none'`, etc.), verified working via both a full production
build/start run and a separate dev-mode run. Re-audited directive-by-directive: no gap beyond one
low-severity nitpick — `object-src` isn't explicitly set to `'none'` (falls back to `default-src
'self'` per spec, so not actually open, just not best-practice-explicit).

~~One gap not addressed anywhere: **no `Content-Security-Policy` header.**~~ Given `X-Frame-Options:
DENY` already covers clickjacking, the marginal risk is limited to XSS mitigation depth (no known
XSS surface found in this audit) — but a CSP is otherwise entirely absent. **Low.**

## 9. Env var hygiene — clean

- Zero `NEXT_PUBLIC_` usages anywhere in the codebase — nothing client-bundle-exposed, and no case
  of a genuinely-public value needlessly kept server-only either. All five env vars
  (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`) are
  legitimately server-only.
- `.env.example` is accurate and complete against actual usage (`VERCEL_ENV`/`VERCEL_URL` are
  correctly omitted since Vercel injects them automatically).
- `.env`/`.env.local` are both gitignored and confirmed via `git log --all` to have never been
  committed.

## 10. Build config / TODO comments

- The webpack watcher-ignore for `.playwright-mcp/**` in `next.config.ts` is a well-documented,
  pragmatic workaround for a known Fast Refresh loop — not a concern.
- Grep for `TODO|FIXME|HACK` across `src/`, `scripts/`, `.github/` returned no real matches (one
  false positive from an overly broad regex matching adjacent Chinese text). Either genuinely
  clean, or follow-ups are tracked in `docs/` instead of inline comments, which matches this
  project's own extensive numbered-plan-doc convention.
- `tsc --noEmit` and `eslint .` both currently pass with zero errors/warnings — confirmed by
  running them directly.

## Summary by severity

- **Blocker**: no automated test suite (project-wide, §1) — **still fully open**, deliberately held.
- **High**: shared dev/prod database with no environment guard on any write-capable script (§2) —
  **✅ fixed** for the two homegrown scripts (`confirm-write.ts`); the broader shared-DB
  architecture itself is unchanged/out of scope.
- **Medium**: no dependency vulnerability scanning (§4) — **✅ fixed**; `@types/node` mismatched
  against the required Node 22 runtime (§5) — **✅ fixed**; silent/unhandled SMTP failure path with
  zero observability (§6) — **✅ fixed**.
- **Low**: `typescript`/`eslint` behind (§5, still open); no CSP header (§8) — **✅ fixed**;
  registration lacks a specific rate-limit rule (§7) — **✅ fixed**; local `npm run build` silently
  skips migrations by design (§3, unchanged, working as intended).
- **Nitpick**: `next build` not in CI, by design (§4); minor/patch dependency drift (§5); CSP
  missing an explicit `object-src 'none'` (§8, new on re-audit, not actually exploitable).
- **Clean, no findings**: `maybe-migrate.mjs` gating logic, env var hygiene, session/cookie
  security flags, rate-limit storage atomicity, TODO/FIXME hygiene. Re-audit additionally checked
  this session's new code (`api-rate-limit.ts`, `confirm-write.ts`, the CSP header, the `npm audit`
  CI step itself) and found no new issues introduced by any of it.

## Re-audit summary (second pass)

All 6 previously-fixed items in this doc (§2 write-guard, §4 npm audit, §5 `@types/node`, §6 SMTP
`.catch()`, §7 registration rate limit, §8 CSP) were re-verified against the actual current code —
genuinely fixed and correctly wired, not just superficially present. §1 (no test suite) remains
fully open with zero mitigation, confirmed accurately described. No new security issues found from
this session's new code.
