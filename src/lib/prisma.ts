import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  var prisma: PrismaClient | undefined;
}

const isCloudflareWorker = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function createClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  // On Cloudflare a database connection cannot outlive the request that opened it,
  // so each connection is used once there. On a normal server they are pooled and reused.
  const adapter = new PrismaPg(isCloudflareWorker ? { connectionString, maxUses: 1 } : { connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // A sale touches many rows and the database is remote, so give transactions room,
    // and let a sale wait its turn when several are saved at the same moment.
    transactionOptions: { maxWait: 15000, timeout: 30000 },
  });
}

const perRequest = new WeakMap<object, PrismaClient>();

function currentClient(): PrismaClient {
  if (isCloudflareWorker) {
    // One client per request, shared by everything that request does.
    const { ctx } = getCloudflareContext();
    let client = perRequest.get(ctx);
    if (!client) {
      client = createClient();
      perRequest.set(ctx, client);
    }
    return client;
  }
  global.prisma ??= createClient();
  return global.prisma;
}

/**
 * The database client. It looks like a single shared client to the rest of the code,
 * but each access is forwarded to the right one for where the app is running.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = currentClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
