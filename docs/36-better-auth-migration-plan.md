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
- **DB-backed rate limiting** — replaces `src/lib/login-rate-limit.ts` + the `LoginFailure` model,
  same "must survive serverless invocations" requirement noted in
  [docs/hold/22-audit-pass-4.md](hold/22-audit-pass-4.md). Correction found only by reading the
  installed version's source, not its docs: `rateLimit.storage: "database"` (what betterauth.com
  describes) **isn't a valid option in 1.6.27** — only `"memory"` or `"secondary-storage"` are. Used
  a small custom `secondaryStorage` adapter (`src/lib/rate-limit-storage.ts`) backed by a new
  `RateLimit` Prisma table instead, including an atomic `increment` (a single upserting SQL
  statement) — without it, better-auth falls back to a non-atomic get-then-set "best-effort" consume
  that logs a warning and lets concurrent requests bypass the limit.
- Setting `secondaryStorage` also makes better-auth default *session and verification-token*
  storage to that same KV store instead of the database (confirmed by reading
  `@better-auth/core/db/get-tables.mjs` directly) — not documented anywhere. Forced both back into
  real Prisma-backed relational tables via `session.storeSessionInDatabase: true` and
  `verification.storeInDatabase: true`, keeping `secondaryStorage` scoped to exactly rate-limit
  counters as intended.
- The custom Prisma generator output path (`output = "../src/generated/prisma"`) is a documented
  supported case for better-auth's Prisma adapter.
- **Login accepts username or email** in the same field (a bare `@` distinguishes them client-side,
  since `@` can never appear in a valid username) — added after building the base migration, since
  email was already a real unique field and there was no reason to force username-only.
- **The reset-password page shows which account it's resetting** (`for user@example.com` above the
  form) — a reset token's owner isn't exposed by any public better-auth API, so this reads it
  directly: better-auth stores a pending reset token as a `Verification` row with
  `identifier: "reset-password:<token>"` and `value` set to the user's id (confirmed against
  `api/routes/password.mjs`). Looked up read-only (`findFirst`, not the token-consuming lookup the
  real reset endpoint uses), so it doesn't interfere with the actual reset.

## Data-loss note

Existing `User`/`Session`/`LoginFailure` rows don't survive this as-is (schema shape changes too
much — passwords move into a new `Account` table, sessions get a new shape). [21-vercel-deploy.md](21-vercel-deploy.md)'s
"no live production data yet" turned out to be stale — the shared Neon database actually had **6
users and 53 attempts** (0 friendships) at migration time. Checked and confirmed explicitly before
running the migration (not assumed); wiped anyway since these were test accounts, no real users to
notify.

## Schema changes

- `User`: keep `id`/`username`/`displayName`; add `email String @unique`, `emailVerified Boolean`;
  remove `passwordHash` (moves into `Account`).
- Remove `Session` and `LoginFailure` models.
- Add `Account`, a new `Session` (better-auth's own shape), `Verification` (reset-token storage),
  and `RateLimit` (this app's own — `key`/`value`/`expiresAt`, backing `secondaryStorage`, not
  better-auth's own built-in rate-limit schema, which was never applicable — see above) — exact
  fields for the better-auth-owned tables confirmed directly against
  `@better-auth/core/db/get-tables.mjs` (the `@better-auth/cli` package lags the installed
  library version, 1.4.21 vs. 1.6.27, so it wasn't trustworthy here), then diffed via `prisma
  migrate diff --script` and hand-adjusted (a `TRUNCATE TABLE "User" CASCADE` prepended — see
  Data-loss note) into a migration SQL file, this repo's existing convention (no interactive
  terminal available for `prisma migrate dev`).
- `Friendship`, `Attempt`, `Word`, etc. — untouched.

## Files touched

- `src/lib/auth.ts` (rewritten) — the `betterAuth(...)` instance, plus `getSessionUser()` kept at
  the exact same signature so all 14 `requireSession()`-gated pages and 7 session-checking API
  routes need zero changes.
- `src/lib/auth-client.ts` (new) — `createAuthClient` + `usernameClient()`, used by
  login/register/forgot/reset pages.
- `src/lib/send-email.ts` (new) — nodemailer + Gmail SMTP.
- `src/lib/rate-limit-storage.ts` (new) — the `secondaryStorage` KV adapter over `RateLimit`,
  including an atomic `increment`.
- `src/app/api/auth/[...all]/route.ts` (new) — `toNextJsHandler(auth)`.
- Deleted: `src/app/api/auth/{login,register,logout,me}/route.ts` (me confirmed zero callers),
  `src/lib/login-rate-limit.ts`.
- `src/app/login/page.tsx` (single field now accepts username or email), `src/app/register/page.tsx`
  (adds a required Email field), `src/components/LogoutButton.tsx` — swapped to `authClient` calls,
  same UI/error/navigation patterns as before.
- `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx` +
  `src/components/ResetPasswordForm.tsx` (new) — the reset page shows which account it's resetting
  and has matching new-password/confirm-password fields, same pattern as register.
- `src/app/api/friends/requests/route.ts` — lowercases the typed username before lookup, since the
  `username` plugin normalizes stored usernames to lowercase by default.
- `package.json` — adds `better-auth`, `nodemailer`, `@types/nodemailer`, `@better-auth/core`.
- New env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  (local `.env` + Vercel Production/Preview).

## Verification

All done live against the running dev server (Playwright) and the real shared Neon database —
not just typechecked:

- `tsc --noEmit` + `eslint .` clean (matches `.github/workflows/ci.yml`).
- Register (username+email+password) → session persists, `AppHeader` shows the right
  `displayName` → log out → log in with username+password → works.
- 4 rapid bad-password attempts → 4th gets a real `429` ("Too many requests"), confirmed via the
  server log; after the 10s window, the correct password logs in fine. Confirmed the atomic
  `increment` path is used (no "best-effort" warning in the log after adding it, vs. present
  before).
- "Forgot password" → **real email received** at the actual Gmail inbox → reset link → landed on
  `/reset-password?token=...` showing the correct account email → set a new password
  successfully.
- Second test account added as a friend by typing its username in a **different case**
  (`AUTHTEST2` vs. stored `authtest2`) → resolved correctly (proves the lowercase-lookup fix in
  `/api/friends/requests`) and rendered its `displayName` on the "Waiting on" list (proves the
  `fields: { name: "displayName" }` mapping holds for other users' rows too, not just the session
  user).
- Logged in with an **email** instead of a username → works (the login-accepts-either addition).
- Ships as its own branch/PR per this repo's branch-protected `main`; CI must pass.
