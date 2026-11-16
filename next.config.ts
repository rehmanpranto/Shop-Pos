import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma loads its own files at run time, so it must stay outside the bundle.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
