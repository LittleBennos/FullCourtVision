import { Metadata } from "next";
import { Github, Database, Server, Globe, Code2, BarChart3, Users, Gamepad2, TableProperties, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "About",
  description: "FullCourtVision — a data science portfolio project analysing every basketball player in Victoria using PlayHQ data.",
};

export const revalidate = 3600;

async function getAboutStats() {
  const [players, games, statLines] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("games").select("*", { count: "exact", head: true }),
    supabase.from("player_stats").select("*", { count: "exact", head: true }),
  ]);
  return {
    players: players.count ?? 57000,
    games: games.count ?? 89000,
    statLines: statLines.count ?? 380000,
  };
}

const techStack = [
  { name: "Next.js", desc: "React framework for the web app", color: "bg-white/10" },
  { name: "Supabase", desc: "Postgres database & API layer", color: "bg-emerald-500/10 text-emerald-400" },
  { name: "Python", desc: "Data scraping & ETL pipeline", color: "bg-yellow-500/10 text-yellow-400" },
  { name: "Recharts", desc: "Interactive data visualisations", color: "bg-blue-500/10 text-blue-400" },
  { name: "Tailwind CSS", desc: "Utility-first styling", color: "bg-cyan-500/10 text-cyan-400" },
  { name: "GraphQL", desc: "PlayHQ API data extraction", color: "bg-pink-500/10 text-pink-400" },
];

const pipelineSteps = [
  { icon: Globe, label: "PlayHQ GraphQL API", desc: "Raw game data from Basketball Victoria's platform" },
  { icon: Database, label: "SQLite", desc: "Local staging database for deduplication & cleaning" },
  { icon: Server, label: "Supabase (Postgres)", desc: "Production database with RPC functions & indexes" },
  { icon: Code2, label: "Next.js Web App", desc: "Server-rendered pages with real-time analytics" },
];

export default async function AboutPage() {
  const stats = await getAboutStats();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Hero */}
      <section className="mb-16">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium mb-6">
          <BarChart3 className="w-4 h-4" />
          Portfolio Project
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          About <span className="text-accent">FullCourtVision</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Built to analyse every basketball player in Victoria using PlayHQ data.
          FullCourtVision is a data engineering and analytics project that transforms
          raw game data into comprehensive player statistics, leaderboards, and insights
          across the entire Basketball Victoria ecosystem.
        </p>
      </section>

      {/* Live Stats */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">The Numbers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, value: stats.players, label: "Players Tracked" },
            { icon: TableProperties, value: stats.statLines, label: "Stat Lines" },
            { icon: Gamepad2, value: stats.games, label: "Games Processed" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-6 text-center">
              <Icon className="w-8 h-8 text-accent mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{value.toLocaleString()}+</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Pipeline */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Data Pipeline</h2>
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineSteps.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="relative bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent font-bold text-sm">
                    {i + 1}
                  </div>
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{label}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
                {i < pipelineSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-muted-foreground text-lg">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Tech Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {techStack.map(({ name, desc, color }) => (
            <div key={name} className="bg-card rounded-xl border border-border p-4">
              <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold mb-2 ${color}`}>
                {name}
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Source Code */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Source Code</h2>
        <a
          href="https://github.com/LittleBennos/FullCourtVision"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors"
        >
          <Github className="w-8 h-8 text-muted-foreground group-hover:text-accent transition-colors" />
          <div>
            <div className="font-semibold group-hover:text-accent transition-colors flex items-center gap-2">
              LittleBennos/FullCourtVision
              <ExternalLink className="w-4 h-4" />
            </div>
            <div className="text-sm text-muted-foreground">View the full source code on GitHub</div>
          </div>
        </a>
      </section>

      {/* Built By */}
      <section className="border-t border-border pt-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center text-white text-xl font-bold">
            B
          </div>
          <div>
            <h2 className="text-xl font-bold">Built by Ben</h2>
            <p className="text-muted-foreground text-sm">
              A data science portfolio project exploring the intersection of sports analytics
              and web development.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
