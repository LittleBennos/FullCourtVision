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
    optimizeCss: true,
  },
  // External packages for server components
  serverExternalPackages: ["@supabase/supabase-js"],
  // Performance optimizations for LCP
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
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
  // Enhanced cache headers and performance optimizations
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
      ],
    },
    {
      source: "/",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        // Early hints for critical resources (LCP optimization)
        { key: "Link", value: "</api/stats>; rel=preload; as=fetch; crossorigin=anonymous" },
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
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
    {
      source: "/(.*)\\.(js|css|woff|woff2)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
