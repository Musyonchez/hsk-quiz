// Per-username lockout for POST /api/auth/login, backed by the `LoginFailure`
// table (see prisma/schema.prisma). Originally an in-memory Map — that broke
// silently once the app moved to Vercel's serverless functions, which don't
// reliably share memory across invocations (docs/22-audit-pass-4.md). Storing
// each failure as its own row keeps the "reset after 15 minutes" logic
// entirely in the query (createdAt within the window), no separate expiry
// bookkeeping needed.
import { prisma } from "@/lib/db";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function key(username: string): string {
  return username.toLowerCase();
}

export async function isLoginLocked(username: string): Promise<boolean> {
  const count = await prisma.loginFailure.count({
    where: { username: key(username), createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
  });
  return count >= MAX_ATTEMPTS;
}

export async function recordLoginFailure(username: string): Promise<void> {
  const k = key(username);
  // Opportunistic prune of this username's own expired rows so a
  // repeatedly-guessed username's row count doesn't grow unbounded over
  // time — cheap, and keeps the table self-bounding per key without a
  // separate cleanup job.
  await prisma.loginFailure.deleteMany({
    where: { username: k, createdAt: { lte: new Date(Date.now() - WINDOW_MS) } },
  });
  await prisma.loginFailure.create({ data: { username: k } });
}

export async function clearLoginFailures(username: string): Promise<void> {
  await prisma.loginFailure.deleteMany({ where: { username: key(username) } });
}
