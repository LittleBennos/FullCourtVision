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
    optimizePackageImports: ["recharts", "lucide-react", "@supabase/supabase-js"],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Better bundle splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split chunks more aggressively for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              name: 'vendor',
              priority: 10,
              enforce: true,
            },
            recharts: {
              test: /[\\/]node_modules[\\/](recharts|d3-).*[\\/]/,
              chunks: 'async',
              name: 'recharts',
              priority: 20,
              enforce: true,
            },
            common: {
              chunks: 'all',
              minChunks: 2,
              priority: 5,
              enforce: true,
            }
          }
        }
      };
    }
    return config;
  },
  // Set default cache headers for static assets
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
      ],
    },
    {
      source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
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
