# Auth wrap-up: security/UX best-practice pass

## Why

Follow-up to [docs/36](36-better-auth-migration-plan.md) — that migration closed the actual gap
(forgot-password) but didn't do a broader best-practices pass over the rest of the auth surface.
This is that pass: researched current OWASP/NIST guidance and web.dev's sign-in/sign-up form
guidance, checked what's already correct (mostly — better-auth's defaults are solid), what needed
one line changed, and what was worth adding.

## Already correct (confirmed, no change needed)

- **Cookies**: `secure` auto-derived from the https baseURL, `sameSite: "lax"`, `httpOnly`
  (confirmed via `better-auth/dist/cookies/index.mjs`) — matches OWASP's session cookie guidance.
- **Session expiry**: better-auth's default is 7 days with a rolling 1-day refresh (active users
  effectively stay logged in; a genuinely stale/inactive session expires within a week) — more
  OWASP-aligned than the pre-migration hand-rolled system's flat 30-day TTL, kept as-is.
- **Password hashing**: scrypt by default (better-auth), matches OWASP's "slow, salted,
  purpose-built" requirement.
- **Rate limiting**: DB-backed, atomic, per [docs/36](36-better-auth-migration-plan.md) — matches
  OWASP's "rate-limit, don't hard-lock" guidance (a 429 with a retry window, not a permanent
  lockout an attacker could exploit to lock out a real user).
- **Forgot-password enumeration protection**: already returns the identical "if this email exists…"
  message and creates a synthetic verification lookup either way (confirmed in
  `password.mjs`) — matches OWASP's Forgot Password Cheat Sheet exactly.
- **Show/hide password toggle**: `PasswordField` already has this — web.dev confirms this is
  standard practice now, not a security downgrade.
- **Paste not disabled** on any password field — correct; disabling paste actively hurts password-
  manager users for no real security benefit.

## Changed

- **`revokeSessionsOnPasswordReset: true`** (`src/lib/auth.ts`) — was off by default. OWASP's
  Forgot Password Cheat Sheet: after a reset, either ask the user whether to invalidate other
  sessions or do it automatically. Went with automatic (simpler, and if someone reset the
  password at all there's a real chance the account was compromised — no reason to leave old
  sessions alive).
- **`autocomplete` attributes** on every auth form input (login, register, forgot-password,
  reset-password, and the new change-password form below) — `username`, `email`,
  `current-password`, `new-password` as appropriate. Directly from web.dev's sign-in/sign-up form
  guides; costs nothing, meaningfully improves password-manager autofill (save-prompt shows the
  right field, browsers stop guessing).

## Added: change password while logged in

The one real functional gap — previously the *only* way to change a password was the public
forgot-password flow, even for a user who knows their current password and is already logged in.
better-auth exposes `changePassword` (`currentPassword`, `newPassword`, `revokeOtherSessions`) out
of the box.

- New `/account` page (`src/app/account/page.tsx`, `requireSession()`-gated) — current password +
  new password + confirm, calls `authClient.changePassword({ currentPassword, newPassword,
  revokeOtherSessions: true })`. Same visual shell/patterns as the other auth pages.
- Linked from `AppHeader` next to the user badge, so it's discoverable without knowing the URL.

## Considered, explicitly deferred

- **Email verification requirement** — better-auth supports it
  (`emailVerification.sendVerificationEmail`), but this app's whole identity has been "self-service
  registration, low friction" since before this migration; requiring a verify-click before playing
  a vocab quiz adds friction disproportionate to the actual risk here (email is only used for
  password reset, not for anything sensitive). Skipped.
- **2FA / passkeys** — real 2026 trend per web.dev/authgear research, but a meaningfully bigger
  scope addition (enrollment UX, recovery codes, an authenticator dependency) than "wrap up" implies
  for a personal vocab-quiz app with no financial/PII stakes. Skipped; revisit if the app ever
  handles anything more sensitive.
- **Session-list / "log out this device" UI** — better-auth supports `listSessions`/
  `revokeSession`, but with `revokeSessionsOnPasswordReset` now on and only one device typically in
  use per account, the marginal value didn't seem worth another page right now. Easy to add later
  against the same API if wanted.
- **Change email, delete account** — both available via better-auth (`changeEmail`, `deleteUser`)
  but `changeEmail` needs its own re-verification flow to do properly and `deleteUser` is
  destructive; neither is "wrap up the existing gap," both are new scope. Deferred.
- **Bumping the password minimum above 8** — OWASP/NIST's stated floor is 8; stronger guidance
  pushes toward 12+, but changing this now would invalidate nothing existing (min-length is
  enforced at signup/reset time only) while adding friction to every new signup. Left at 8,
  matching the pre-migration value.

## Files touched

- `src/lib/auth.ts` — `revokeSessionsOnPasswordReset: true`.
- `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/forgot-password/page.tsx`,
  `src/components/ResetPasswordForm.tsx` — `autocomplete` attributes added.
- `src/app/account/page.tsx` (new), `src/components/ChangePasswordForm.tsx` (new).
- `src/components/AppHeader.tsx` — account link.

## Verification

- `tsc --noEmit` + `eslint .` clean.
- Live: log in → change password on `/account` with the current password → confirm error on wrong
  current password → confirm success, other sessions revoked (log in elsewhere first, confirm it's
  kicked) → log out → log back in with the new password.
