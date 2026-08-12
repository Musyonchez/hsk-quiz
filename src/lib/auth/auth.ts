// Self-hosted better-auth (docs/36) — replaces the old hand-rolled
// scrypt+session-token system in favor of a maintained library with a real
// forgot-password flow. Every decision here is explained in docs/36; the
// short version:
//   - `advanced.database.generateId: "serial"` keeps `User.id` an Int
//     autoincrement column, so `Friendship`/`Attempt`'s existing Int foreign
//     keys need no changes.
//   - `user.fields.name: "displayName"` keeps the actual Prisma/Postgres
//     column named `displayName` (better-auth's own API still calls it
//     `.name` when you talk to it, e.g. `session.user.name` below) — every
//     other query in the app (queries.ts, LeaderboardTable, UserBadge,
//     friends/page.tsx) keeps selecting `displayName` unchanged.
//   - the `username` plugin adds a real, unique `username` column alongside
//     email — required for `/api/friends/requests` to keep resolving a
//     friend by typed username, and for login to stay username+password
//     rather than switching to email+password.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/auth/send-email";
import { rateLimitStorage } from "@/lib/rate-limit-storage";
import { siteUrl } from "@/lib/site-url";

// Matches the old USERNAME_PATTERN in the register route this replaces —
// letters, numbers, underscore, hyphen, 3-20 chars.
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

// Every Preview deployment gets its own unique URL, so a single fixed
// BETTER_AUTH_URL is wrong there — and better-auth does origin-checking on
// some callback routes (e.g. the password-reset redirect), so a mismatched
// baseURL can actively break those, not just warn. On Production, though,
// VERCEL_URL is the unique *deployment* hash domain, not the stable
// assigned domain (hsk-quiz-xi.vercel.app) users actually visit — using it
// there would mismatch the opposite way. This exact VERCEL_ENV-gating
// pattern (also used by scripts/maybe-migrate.mjs) is shared via
// src/lib/site-url.ts, since the metadata/sitemap/robots.ts SEO work needs
// the identical logic.
const baseURL = siteUrl;

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: {
      generateId: "serial",
    },
  },
  user: {
    fields: {
      name: "displayName",
    },
  },
  // Setting `secondaryStorage` below (for durable rate limiting) makes
  // better-auth default session/verification-token storage to that KV store
  // instead of the database — confirmed by reading
  // @better-auth/core/db/get-tables.mjs directly (its logic is
  // `!secondaryStorage || storeSessionInDatabase`), not something the public
  // docs mention. Forcing both back into real Prisma-backed relational
  // tables (`Session`, `Verification`) here keeps `secondaryStorage` scoped
  // to exactly what it's for: rate-limit counters.
  session: {
    storeSessionInDatabase: true,
  },
  verification: {
    storeInDatabase: true,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // OWASP's Forgot Password Cheat Sheet: after a reset, either ask the
    // user whether to invalidate other sessions or do it automatically
    // (docs/37). A password reset is exactly the moment a device the
    // account owner doesn't control might hold a live session.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited on purpose: awaiting the email send would let response
      // timing distinguish "user exists, email sent" from "user doesn't
      // exist, nothing sent" — the same timing-attack concern the old
      // UNREACHABLE_PASSWORD_HASH decoy in the previous auth.ts existed to
      // close. better-auth's own docs recommend the same fire-and-forget
      // pattern for this callback. That intentionally means the user never
      // gets told if the send actually failed (a bad Gmail app-password, an
      // SMTP outage) — but "no feedback to the user" shouldn't also mean "no
      // record anywhere" (docs/45-audit-infra-security.md §6): without a
      // .catch() here, a rejected promise from a `void`-called async
      // function is just an unhandled rejection, easy to miss in logs. This
      // only adds visibility for whoever's watching server logs — it
      // doesn't change what the user sees, which is the whole point.
      void sendEmail({
        to: user.email,
        subject: "Reset your HSK Quiz password",
        html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      }).catch((err) => {
        console.error("Failed to send password-reset email:", err);
      });
    },
  },
  // Rate limiting stored via a Postgres-backed secondaryStorage adapter
  // (src/lib/rate-limit-storage.ts) rather than "memory" — see that file's
  // comment for why "storage: \"database\"\" (what better-auth's own docs
  // describe) isn't actually a valid option in the installed version.
  secondaryStorage: rateLimitStorage,
  rateLimit: {
    // better-auth only enables rate limiting by default in production
    // (NODE_ENV-gated). This app's local dev talks to the same shared Neon
    // database as production (docs/05-architecture.md — no dev/prod DB
    // split), so that default doesn't fit; force it on everywhere.
    enabled: true,
    customRules: {
      "/sign-in/username": { window: 10, max: 3 },
      // The login page's single field accepts either identifier (docs/36) —
      // same limit on both paths.
      "/sign-in/email": { window: 10, max: 3 },
      "/forget-password": { window: 60, max: 3 },
      // Registration had no rule at all, falling back to better-auth's
      // generous global default (100 per 10s) — effectively no throttling
      // on account-creation spam/automation (docs/45-audit-infra-security.md
      // §7). 5 per 60s is loose enough for legitimate use (a household on
      // one IP registering a few accounts) while actually capping a script.
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    // Must be last in the plugins array per better-auth's own convention —
    // auto-forwards Set-Cookie headers for any server-side auth.api.* calls.
    nextCookies(),
  ],
});

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
};

/**
 * Reads the session cookie (if any) and returns the logged-in user, or null.
 * Safe to call from Server Components. Kept at the exact same name/signature
 * as the pre-migration version so every existing call site (14 pages'
 * `requireSession()`, 7 API routes, `AppHeader`, the landing page) needs no
 * changes — see docs/36.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  return {
    // better-auth returns serial ids as numeric strings ("5", not 5) — every
    // call site downstream (Prisma queries, comparisons) expects a real
    // number.
    id: Number(user.id),
    username: user.username as string,
    displayName: user.name,
    email: user.email,
  };
}
