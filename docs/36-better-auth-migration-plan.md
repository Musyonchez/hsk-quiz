# Auth migration: hand-rolled sessions → self-hosted better-auth

## Why

The hand-rolled auth (`src/lib/auth.ts` — scrypt password hashing, sha256-hashed session tokens,
a `LoginFailure` table for lockout) was solid but had no forgot-password flow, which is the actual
feature needed now. Rather than bolt a one-off reset flow onto custom code, this replatforms onto
[`better-auth`](https://better-auth.com) — free, MIT-licensed, the library
[Vercel just acquired](https://vercel.com/blog/vercel-acquires-better-auth) (July 2026, and it
stays free/open source).

## Options considered

- **Neon's "Managed Better Auth"** (a Beta add-on now on the Neon dashboard, "BetterAuth Enabled"
  service tile) — rejected. Its docs only demonstrate email-based sign-in/sign-up; no confirmed
  username support, and no control over the reset-email flow (it's Neon-hosted, auth data lives in
  its own `neon_auth` schema you don't manage via Prisma).
- **OAuth (Google/GitHub login)** — explicitly ruled out. No Google Cloud Console setup.
- **Self-hosted `better-auth`** (chosen) — same free library, run ourselves against the existing
  Neon/Prisma database, full control over the reset email and schema.

Password-reset emails need *some* outbound relay — Vercel serverless functions can't run a mail
server. Chose **Gmail SMTP + an app password** over a dedicated transactional-email service
(Resend, etc.): reuses an existing Gmail account, no new third-party signup, no domain
verification.

## Key technical decisions

- **Keep `User.id` as `Int` autoincrement**, not better-auth's default string ID — via
  `advanced.database.generateId: "serial"`. Avoids cascading type changes through
  `Friendship.userId/friendId` and `Attempt.userId`, which stay untouched.
- **Keep the Prisma column named `displayName`**, not better-auth's default `name` — via the
  `user: { fields: { name: "displayName" } }` config mapping. App code (`queries.ts`,
  `LeaderboardTable`, `UserBadge`, `friends/page.tsx`, `AppHeader`) keeps reading `displayName`
  unchanged; only the new `src/lib/auth.ts` wrapper needs to know better-auth's API calls it
  `.name`.
- **`username` plugin** (server + client) adds a real, unique `username` column alongside email —
  keeps `src/app/api/friends/requests/route.ts`'s `prisma.user.findUnique({ where: { username } })`
  working unchanged, and keeps login as username+password (not email+password). Email is net-new,
  used only for password reset.
- **DB-backed rate limiting** (`rateLimit: { storage: "database", customRules: {
  "/sign-in/username": { window: 10, max: 3 } } }`) replaces `src/lib/login-rate-limit.ts` + the
  `LoginFailure` model — same "must survive serverless invocations" requirement noted in
  [docs/hold/22-audit-pass-4.md](hold/22-audit-pass-4.md), now handled by the library.
- The custom Prisma generator output path (`output = "../src/generated/prisma"`) is a documented
  supported case for better-auth's Prisma adapter.

## Data-loss note

Existing `User`/`Session`/`LoginFailure` rows don't survive this as-is (schema shape changes too
much — passwords move into a new `Account` table, sessions get a new shape). No known live
production accounts worth preserving (per [21-vercel-deploy.md](21-vercel-deploy.md)'s "no live
production data yet"), but noted explicitly since it's irreversible once the migration runs.

## Schema changes

- `User`: keep `id`/`username`/`displayName`; add `email String @unique`, `emailVerified Boolean`;
  remove `passwordHash` (moves into `Account`).
- Remove `Session` and `LoginFailure` models.
- Add `Account`, a new `Session` (better-auth's own shape), `Verification` (reset-token storage),
  `RateLimit` — exact fields generated via better-auth's own schema generator against the real
  config, then hand-written into a migration SQL file (this repo's existing convention — no
  interactive terminal available for `prisma migrate dev`, see e.g.
  `prisma/migrations/20260809050000_word_mnemonic/migration.sql`).
- `Friendship`, `Attempt`, `Word`, etc. — untouched.

## Files touched

- `src/lib/auth.ts` (rewritten) — the `betterAuth(...)` instance, plus `getSessionUser()` kept at
  the exact same signature so all 14 `requireSession()`-gated pages and 7 session-checking API
  routes need zero changes.
- `src/lib/auth-client.ts` (new) — `createAuthClient` + `usernameClient()`, used by
  login/register/forgot/reset pages.
- `src/lib/send-email.ts` (new) — nodemailer + Gmail SMTP.
- `src/app/api/auth/[...all]/route.ts` (new) — `toNextJsHandler(auth)`.
- Deleted: `src/app/api/auth/{login,register,logout,me}/route.ts` (me confirmed zero callers),
  `src/lib/login-rate-limit.ts`.
- `src/app/login/page.tsx`, `src/app/register/page.tsx` (adds a required Email field),
  `src/components/LogoutButton.tsx` — swapped to `authClient` calls, same UI/error/navigation
  patterns as before.
- `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx` (new).
- `package.json` — adds `better-auth`, `nodemailer`, `@types/nodemailer`.
- New env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  (local `.env` + Vercel Production/Preview).

## Verification

- `tsc --noEmit` + `eslint .` clean (matches `.github/workflows/ci.yml`).
- Register (username+email+password) → session persists across reload → log out → log back in →
  3 rapid bad attempts locks out (customRule) → "Forgot password" → real email arrives via Gmail
  SMTP → reset link sets a new password → old password rejected, new one works.
- `/api/friends/requests` still resolves a target by typed username.
- Leaderboard/friends pages still render `displayName` correctly (proves the `fields: { name:
  "displayName" }` mapping worked at the schema level).
- Ships as its own branch/PR per this repo's branch-protected `main`; CI must pass.
