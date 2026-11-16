import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: { maxWait: 15000, timeout: 30000 },
  });
}

export const prisma = global.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
