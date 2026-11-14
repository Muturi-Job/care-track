import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API status must be read per request, never cached or prerendered.
  // Cache Components rejects `export const dynamic = "force-dynamic"`, so it is
  // off for Phase A: no caching layer, per CLAUDE.md rule 5.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
