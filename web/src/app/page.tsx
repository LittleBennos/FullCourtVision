import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import dynamic from "next/dynamic";

// Lazy load ALL non-critical components to maximize LCP performance
const StatsSection = dynamic(() => import("@/components/stats-section").then(m => ({ default: m.StatsSection })), {
  loading: () => <div className="h-20 bg-transparent" />,
});

const RecentActivityLazy = dynamic(() => import("@/components/recent-activity-lazy").then(m => ({ default: m.RecentActivityLazy })), {
  loading: () => <div className="h-32 bg-transparent" />,
});

const QuickLinksLazy = dynamic(() => import("@/components/quick-links-lazy").then(m => ({ default: m.QuickLinksLazy })), {
  loading: () => <div className="h-24 bg-transparent" />,
});

export const revalidate = 3600; // Revalidate every hour
// Static generation for optimal LCP performance

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

export default function Home() {
  // Remove all server-side data fetching for optimal LCP
  // All dynamic data will be loaded client-side after LCP

  return (
    <div>
      {/* Critical inline styles for LCP optimization - Enhanced for better performance */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .lcp-text { 
            font-size: 1.125rem; 
            line-height: 1.75rem; 
            color: rgb(100 116 139); 
            margin-bottom: 2rem; 
            max-width: 42rem;
            contain: layout style;
          }
          .hero-heading { 
            font-size: clamp(2.25rem, 5vw, 3.75rem); 
            font-weight: 700; 
            letter-spacing: -0.025em; 
            margin-bottom: 1.5rem; 
            line-height: 1.1;
            contain: layout style;
            will-change: auto;
          }
          .hero-section {
            contain: layout style;
            position: relative;
            overflow: hidden;
          }
          .hero-gradient {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 50%, transparent 100%);
            pointer-events: none;
          }
          .hero-content {
            max-width: 1280px;
            margin: 0 auto;
            padding: 5rem 1rem 8rem;
            position: relative;
            z-index: 1;
          }
          @media (min-width: 768px) { 
            .hero-heading { font-size: clamp(3.75rem, 8vw, 6rem); }
            .hero-content { padding: 8rem 1rem; }
          }`
      }} />
      
      {/* Hero - LCP optimized */}
      <section className="hero-section">
        <div className="hero-gradient" />
        <div className="hero-content">
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
            <div className="flex flex-wrap gap-3 mb-6">
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
            <DataFreshnessBadge />
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

      {/* Deferred loading of ALL non-critical components for optimal LCP */}
      <div suppressHydrationWarning>
        {/* Stats - Load after LCP, no server-side data */}
        <StatsSection />

        {/* Recent Activity Feed - Load after LCP */}
        <RecentActivityLazy />

        {/* Quick Links - Load after LCP */}
        <QuickLinksLazy />
      </div>
    </div>
  );
}