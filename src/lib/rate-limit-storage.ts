// A minimal Postgres-backed key/value store, passed to better-auth as
// `secondaryStorage` (docs/36). better-auth's own `rateLimit.storage` option
// only accepts "memory" or "secondary-storage" in the installed version
// (1.6.27) — there's no built-in "database" option, despite that being what
// betterauth.com's docs describe (docs drift vs. the actual installed
// version — see AGENTS.md's warning about breaking changes vs. training
// data). "memory" would silently stop working across Vercel's serverless
// invocations, the exact bug class docs/hold/22-audit-pass-4.md already hit
// once with the original in-memory Map lockout — so this small adapter over
// the `RateLimit` table is what actually gets durable rate limiting.
import { prisma } from "@/lib/db";
import type { SecondaryStorage } from "@better-auth/core/db";

export const rateLimitStorage: SecondaryStorage = {
  async get(key) {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < new Date()) {
      await prisma.rateLimit.delete({ where: { key } }).catch(() => {});
      return null;
    }
    return row.value;
  },
  async set(key, value, ttl) {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, value, expiresAt },
      update: { value, expiresAt },
    });
  },
  async delete(key) {
    await prisma.rateLimit.deleteMany({ where: { key } });
  },
  // Without this, better-auth falls back to a non-atomic get-then-set
  // "best-effort" consume (it logs a warning to that effect) — concurrent
  // requests for the same key can each read the same pre-increment count
  // before either writes back, letting a burst of parallel attempts slip
  // past the limit. A single upsert statement is atomic under Postgres row
  // locking, so implementing this closes that race for a security-relevant
  // feature. TTL applies only on first creation (or after a row has already
  // expired) — later increments never extend it, matching the interface's
  // documented contract.
  async increment(key, ttl) {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      INSERT INTO "RateLimit" ("key", "value", "expiresAt")
      VALUES (${key}, '1', NOW() + (${ttl} * INTERVAL '1 second'))
      ON CONFLICT ("key") DO UPDATE SET
        "value" = CASE
          WHEN "RateLimit"."expiresAt" IS NULL OR "RateLimit"."expiresAt" >= NOW()
            THEN (CAST("RateLimit"."value" AS INTEGER) + 1)::text
          ELSE '1'
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" IS NULL OR "RateLimit"."expiresAt" >= NOW()
            THEN "RateLimit"."expiresAt"
          ELSE NOW() + (${ttl} * INTERVAL '1 second')
        END
      RETURNING "value"
    `;
    return Number(rows[0]!.value);
  },
};
