import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// docs/41-audit-backend-data.md / docs/45-audit-infra-security.md: the
// RateLimit table (better-auth's own sign-in/reset-password limiting via
// rate-limit-storage.ts, plus this app's own checkRateLimit in
// api-rate-limit.ts) is written to constantly but nothing ever deleted an
// expired row outside the one key being read/incremented at request time —
// unbounded growth over a long production lifetime. Vercel Cron (configured
// in vercel.json) hits this route on a schedule to sweep them.
//
// Rows with `expiresAt: null` are permanent-by-design (rate-limit-storage's
// `set` stores null when better-auth calls it with no TTL) and are correctly
// excluded here — Prisma's `lt` comparison on a nullable column only matches
// non-null values, never null itself.
//
// Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` on every
// invocation when a CRON_SECRET env var is set (documented Vercel behavior)
// — this is what stops the route being a public "spam my DB with deletes"
// endpoint if its path ever leaked. Requires CRON_SECRET to be set in every
// environment Vercel actually invokes this from; unset locally, so a bare
// `curl localhost:3000/api/cron/purge-rate-limits` during dev correctly 401s
// unless CRON_SECRET is also set in .env.local.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
