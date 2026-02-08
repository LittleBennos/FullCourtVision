import Link from "next/link";
import { Users, Gamepad2, Building2, Trophy, ArrowRight, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getStats, getFeaturedPlayer } from "@/lib/data";

export default function Home() {
  const stats = getStats();
  const featured = getFeaturedPlayer();
  const fp = featured.player;
  const totalGames = featured.stats.reduce((s, st) => s + (st.games_played || 0), 0);
  const totalPoints = featured.stats.reduce((s, st) => s + (st.total_points || 0), 0);
  const ppg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";

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

      {/* Featured Player */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-6">Featured Player</h2>
        <div className="bg-card rounded-xl border border-border p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm text-accent font-medium mb-1">SPOTLIGHT</p>
              <h3 className="text-3xl font-bold mb-2">{fp.first_name} {fp.last_name}</h3>
              <p className="text-muted-foreground">
                {featured.stats.length} season{featured.stats.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">{ppg}</p>
                <p className="text-sm text-muted-foreground">PPG</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalPoints}</p>
                <p className="text-sm text-muted-foreground">Total Pts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalGames}</p>
                <p className="text-sm text-muted-foreground">Games</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href={`/players/${fp.id}`}
              className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
            >
              View Full Profile <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

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
