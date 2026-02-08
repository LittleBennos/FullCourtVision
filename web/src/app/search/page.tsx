"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Activity, Building2 } from "lucide-react";
import allPlayers from "@/data/all_players.json";
import teams from "@/data/teams.json";
import organisations from "@/data/organisations.json";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return { players: [], teams: [], orgs: [] };

    const players = allPlayers
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
      .slice(0, 20);

    const matchedTeams = teams
      .filter((t) => t.name?.toLowerCase().includes(q))
      .slice(0, 20);

    const orgs = organisations
      .filter((o) => o.name?.toLowerCase().includes(q))
      .slice(0, 20);

    return { players, teams: matchedTeams, orgs };
  }, [query]);

  const total = results.players.length + results.teams.length + results.orgs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search players, teams, organisations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {query.length >= 2 && (
        <p className="text-sm text-muted-foreground mb-6">{total} results for &quot;{query}&quot;</p>
      )}

      {results.players.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Users className="w-5 h-5 text-accent" /> Players
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {results.players.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="font-medium">{p.first_name} {p.last_name}</span>
                <span className="text-sm text-muted-foreground">{p.total_games} games · {p.ppg} PPG</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.teams.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Activity className="w-5 h-5 text-accent" /> Teams
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {results.teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-muted-foreground">{t.org_name || ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results.orgs.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Building2 className="w-5 h-5 text-accent" /> Organisations
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {results.orgs.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{o.name}</span>
                <span className="text-sm text-muted-foreground">{o.suburb ? `${o.suburb}, ${o.state}` : o.type || ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && total === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
