import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  // Set default cache headers for static assets
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
      ],
    },
  ],
  // Fix turbopack workspace root warning
  turbopack: {},
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
};

// Bundle analyzer (can be enabled with ANALYZE=true)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withSerwist(withBundleAnalyzer(nextConfig));
