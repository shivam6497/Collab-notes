import { PrismaClient } from "@prisma/client";

/**
 * Attach the PrismaClient singleton to `globalThis` in development so that
 * hot-module reloads don't create a new connection pool on every file change.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

prisma.$connect().catch((err) => {
  console.error("Prisma initial connection failed:", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
