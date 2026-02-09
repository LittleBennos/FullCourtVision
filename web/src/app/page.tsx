import Link from "next/link";
import { Users, Gamepad2, Building2, Trophy, ArrowRight, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { RecentActivity } from "@/components/recent-activity";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { getStats, getRecentGames, getWeeklyFeaturedGames, getThisWeekInNumbers } from "@/lib/data";

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata() {
  const stats = await getStats();
  
  return {
    title: "FullCourtVision | Basketball Victoria Analytics",
    description: `Comprehensive basketball analytics covering ${stats.players.toLocaleString()} players, ${stats.games.toLocaleString()} games, and ${stats.organisations.toLocaleString()} organisations across Victorian basketball.`,
    openGraph: {
      title: "FullCourtVision | Basketball Victoria Analytics",
      description: `Comprehensive basketball analytics covering ${stats.players.toLocaleString()} players, ${stats.games.toLocaleString()} games, and ${stats.organisations.toLocaleString()} organisations across Victorian basketball.`,
      type: "website",
      images: ["/api/og?type=homepage"],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: "FullCourtVision | Basketball Victoria Analytics",
      description: `Comprehensive basketball analytics covering ${stats.players.toLocaleString()} players, ${stats.games.toLocaleString()} games, and ${stats.organisations.toLocaleString()} organisations across Victorian basketball.`,
    },
  };
}

export default async function Home() {
  const [stats, recentGames, featuredGames, weeklyNumbers] = await Promise.all([
    getStats(),
    getRecentGames(20),
    getWeeklyFeaturedGames(),
    getThisWeekInNumbers(),
  ]);

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
              Comprehensive analytics covering {stats.players.toLocaleString()} players,{" "}
              {stats.games.toLocaleString()} games, and {stats.organisations.toLocaleString()} organisations
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

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Players" value={stats.players} icon={Users} />
          <StatCard label="Games" value={stats.games} icon={Gamepad2} />
          <StatCard label="Organisations" value={stats.organisations} icon={Building2} />
          <StatCard label="Competitions" value={stats.competitions} icon={Trophy} />
        </div>
      </section>

      {/* Recent Activity Feed */}
      <RecentActivity 
        games={recentGames}
        featuredGames={featuredGames}
        weeklyNumbers={weeklyNumbers}
      />

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-6">Explore</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/players", title: "Player Directory", desc: "Search and filter all tracked players", icon: Users },
            { href: "/leaderboards", title: "Leaderboards", desc: "Top scorers, most games, best shooters", icon: Trophy },
            { href: "/teams", title: "Team Directory", desc: "Browse teams and their records", icon: Building2 },
          ].map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors"
            >
              <Icon className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold mb-1 group-hover:text-accent transition-colors">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
