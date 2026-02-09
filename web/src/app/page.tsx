import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { StatsSection } from "@/components/stats-section";
import { RecentActivityLazy } from "@/components/recent-activity-lazy";
import { QuickLinksLazy } from "@/components/quick-links-lazy";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { getStats } from "@/lib/data";

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
  };
}

export default async function Home() {
  // Try to get stats server-side, but don't block if slow
  let serverStats;
  try {
    const statsPromise = getStats();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 500)
    );
    serverStats = await Promise.race([statsPromise, timeoutPromise]);
  } catch {
    // If stats are slow, use fallback and load client-side
    serverStats = null;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Basketball Victoria Analytics
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Every player. Every game.{" "}
              <span className="text-accent">Every stat.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
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

      {/* Stats - Lazy loaded for better LCP */}
      <StatsSection initialStats={serverStats} />

      {/* Recent Activity Feed - Lazy loaded */}
      <RecentActivityLazy />

      {/* Quick Links - Lazy loaded as not critical for LCP */}
      <QuickLinksLazy />
    </div>
  );
}