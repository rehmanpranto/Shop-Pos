import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // A sale touches many rows and the database is remote, so give transactions room,
    // and let a sale wait its turn when several are saved at the same moment.
    transactionOptions: { maxWait: 15000, timeout: 30000 },
  });
}

function currentClient(): PrismaClient {
  // One client per server instance, kept on `global` so development reloads reuse it.
  global.prisma ??= createClient();
  return global.prisma;
}

/**
 * The database client. It is created on first use rather than when this file loads,
 * so building the app does not need a database connection.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = currentClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
