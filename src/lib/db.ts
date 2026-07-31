// Dev-only adapter: Prisma 7 requires an explicit driver adapter, and SQLite
// is dev/test-only per website/docs/05-architecture.md. Swapping to Postgres
// in prod means swapping this adapter (e.g. @prisma/adapter-pg), not just the
// schema.prisma provider.
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
