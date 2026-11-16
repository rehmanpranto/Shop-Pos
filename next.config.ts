import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Prisma must stay outside the bundle so the Cloudflare build can swap in its Workers version.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;

// Makes Cloudflare bindings available while running `next dev`.
initOpenNextCloudflareForDev();
