// A tiny, generic rate limiter for this app's own API routes (as opposed to
// `rate-limit-storage.ts`, which implements better-auth's specific
// `SecondaryStorage` interface for its own sign-in/reset-password limiting).
// Reuses the same `RateLimit` table and the same atomic upsert-based
// increment (docs/41-audit-backend-data.md flagged that this app's own
// mutating routes had no rate limiting at all — `/api/attempts` in
// particular accepts client-supplied score/total with no check against a
// real quiz session, so a logged-in user could otherwise script unlimited
// leaderboard-padding POSTs).
import { prisma } from "@/lib/db";

/**
 * Returns true if the call under `key` is allowed (and counts it), false if
 * the caller has hit `max` calls within the trailing `windowSeconds`. Atomic
 * under Postgres row locking — see rate-limit-storage.ts's `increment` for
 * why that matters (a non-atomic get-then-set lets a burst of concurrent
 * requests all slip past the same limit).
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  max: number
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    INSERT INTO "RateLimit" ("key", "value", "expiresAt")
    VALUES (${key}, '1', NOW() + (${windowSeconds} * INTERVAL '1 second'))
    ON CONFLICT ("key") DO UPDATE SET
      "value" = CASE
        WHEN "RateLimit"."expiresAt" IS NULL OR "RateLimit"."expiresAt" >= NOW()
          THEN (CAST("RateLimit"."value" AS INTEGER) + 1)::text
        ELSE '1'
      END,
      "expiresAt" = CASE
        WHEN "RateLimit"."expiresAt" IS NULL OR "RateLimit"."expiresAt" >= NOW()
          THEN "RateLimit"."expiresAt"
        ELSE NOW() + (${windowSeconds} * INTERVAL '1 second')
      END
    RETURNING "value"
  `;
  const count = Number(rows[0]!.value);
  return count <= max;
}
