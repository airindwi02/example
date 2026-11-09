import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ALANA_ISOLATED_AUTH_TEST === "enabled" ? ".next-auth-browser-test" : ".next",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
