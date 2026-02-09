import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { StatsSection } from "@/components/stats-section";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { getStats, type Stats } from "@/lib/data";
import dynamic from "next/dynamic";

// Dynamically import non-critical components to reduce initial bundle
const RecentActivityLazy = dynamic(() => import("@/components/recent-activity-lazy").then(m => ({ default: m.RecentActivityLazy })), {
  loading: () => <div className="h-32 animate-pulse bg-muted rounded" />
});

const QuickLinksLazy = dynamic(() => import("@/components/quick-links-lazy").then(m => ({ default: m.QuickLinksLazy })), {
  loading: () => <div className="h-24 animate-pulse bg-muted rounded" />
});

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata() {
  // Use static values for metadata to avoid blocking on database
  return {
    title: "FullCourtVision | Basketball Victoria Analytics",
    description: "Comprehensive basketball analytics covering 57,000+ players, 89,000+ games, and 150+ organisations across Victorian basketball.",
    openGraph: {
      title: "FullCourtVision | Basketball Victoria Analytics",
      description: "Comprehensive basketball analytics covering 57,000+ players, 89,000+ games, and 150+ organisations across Victorian basketball.",
      type: "website",
      images: ["/api/og?type=homepage"],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: "FullCourtVision | Basketball Victoria Analytics",
      description: "Comprehensive basketball analytics covering 57,000+ players, 89,000+ games, and 150+ organisations across Victorian basketball.",
    },
    other: {
      // Preload critical LCP text content
      'x-preload-content': 'true',
    },
  };
}

export default async function Home() {
  // Reduce server-side processing for faster TTFB and LCP
  let serverStats = undefined;
  try {
    // Reduce timeout to 200ms for faster initial render
    const statsPromise = getStats();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 200)
    );
    serverStats = await Promise.race([statsPromise, timeoutPromise]) as Awaited<ReturnType<typeof getStats>>;
  } catch {
    // If stats are slow, use fallback and load client-side
    serverStats = undefined;
  }

  return (
    <div>
      {/* Critical inline styles for LCP optimization */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .lcp-text { 
            font-size: 1.125rem; 
            line-height: 1.75rem; 
            color: rgb(100 116 139); 
            margin-bottom: 2rem; 
            max-width: 42rem;
          }
          .hero-heading { 
            font-size: clamp(2.25rem, 5vw, 3.75rem); 
            font-weight: 700; 
            letter-spacing: -0.025em; 
            margin-bottom: 1.5rem; 
            line-height: 1.1;
          }
          @media (min-width: 768px) { 
            .hero-heading { font-size: clamp(3.75rem, 8vw, 6rem); } 
          }`
      }} />
      
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Basketball Victoria Analytics
            </div>
            <h1 className="hero-heading">
              Every player. Every game.{" "}
              <span className="text-accent">Every stat.</span>
            </h1>
            <p className="lcp-text">
              Comprehensive analytics covering 57,000+ players, 89,000+ games, and 150+ organisations
              across Victorian basketball.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/players"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explore Players
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/leaderboards"
                className="inline-flex items-center gap-2 bg-card hover:bg-muted border border-border text-foreground px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Leaderboards
              </Link>
            </div>
            <div className="mt-6">
              <DataFreshnessBadge />
            </div>
          </div>
        </div>
      </section>

      {/* Script to optimize loading priority for LCP */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Defer non-critical resource loading after LCP
            window.addEventListener('load', function() {
              setTimeout(function() {
                // Load non-critical styles
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/_next/static/css/secondary.css';
                document.head.appendChild(link);
              }, 100);
            });
          `
        }}
      />

      {/* Deferred loading of non-critical components for LCP optimization */}
      <div suppressHydrationWarning>
        {/* Stats - Load after LCP */}
        <StatsSection initialStats={serverStats} />

        {/* Recent Activity Feed - Load after LCP */}
        <RecentActivityLazy />

        {/* Quick Links - Load after LCP */}
        <QuickLinksLazy />
      </div>
    </div>
  );
}