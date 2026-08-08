// Prisma 7 requires an explicit driver adapter. This app runs on Neon
// Postgres (docs/hold/20-postgres-vercel-migration-plan.md) via @prisma/adapter-neon,
// which talks to Postgres over HTTP/WebSockets (@neondatabase/serverless)
// instead of a pooled TCP connection — the right fit for serverless hosts
// like Vercel, where many short-lived function instances opening
// traditional TCP connections against a small Postgres instance is a real
// connection-exhaustion risk that Neon's adapter avoids.
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
