// Runs before every build. On a Vercel production deploy it applies any database
// migrations that have not been applied yet, so new tables and columns exist before
// the new code goes live. If it fails, the build stops and the previous deployment
// keeps running. Preview deploys and local builds skip it unless MIGRATE_ON_BUILD=1.

import { spawnSync } from "node:child_process";

const isProduction = process.env.VERCEL_ENV === "production";
if (!isProduction && process.env.MIGRATE_ON_BUILD !== "1") {
  console.log("Skipping database migrations (not a Vercel production build).");
  process.exit(0);
}

// Migrations need a direct connection: Neon's pooled address cannot hold the lock
// Prisma takes while migrating. Use DATABASE_URL_UNPOOLED when it is set, otherwise
// derive the direct address from DATABASE_URL by dropping "-pooler" from the host.
function directUrl() {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  const pooled = process.env.DATABASE_URL;
  if (!pooled) return undefined;
  const url = new URL(pooled);
  url.hostname = url.hostname.replace("-pooler.", ".");
  return url.toString();
}

const url = directUrl();
if (!url) {
  console.error("\nDATABASE_URL is missing. Add it in Vercel under Settings > Environment Variables.\n");
  process.exit(1);
}

console.log("Applying database migrations...");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
