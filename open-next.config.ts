import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = {
  // Every page in this app is rendered per request, so no cache storage (R2/KV) is needed.
  ...defineCloudflareConfig({}),
  // `npm run build` runs the Cloudflare build, which in turn builds Next.js with this
  // command. Without it the Cloudflare build would call `npm run build` and loop forever.
  buildCommand: "npx next build",
};

export default config;
