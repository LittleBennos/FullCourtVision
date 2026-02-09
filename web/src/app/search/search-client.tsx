"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Users, Activity, Building2, Loader2 } from "lucide-react";
import { FavouriteButton } from "@/components/favourite-button";

type PlayerResult = { id: string; name: string; total_games: number; ppg: number };
type TeamResult = { id: string; name: string; organisation_name?: string };
type OrgResult = { id: string; name: string; suburb?: string; state?: string; type?: string };

export function SearchClient() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ players: PlayerResult[]; teams: TeamResult[]; organisations: OrgResult[] }>({
    players: [], teams: [], organisations: [],
  });

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const fetchResults = useCallback(async () => {
    if (query.length < 2) {
      setResults({ players: [], teams: [], organisations: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data || { players: [], teams: [], organisations: [] });
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const total = results.players.length + results.teams.length + results.organisations.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search players, teams, organisations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {query.length >= 2 && !loading && (
        <p className="text-sm text-muted-foreground mb-6">{total} results for &quot;{query}&quot;</p>
      )}

      {results.players.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Users className="w-5 h-5 text-accent" /> Players
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {results.players.map((p) => (
              <div key={p.id} className="flex items-center px-4 py-3 hover:bg-muted/30 transition-colors">
                <FavouriteButton id={p.id} type="player" className="mr-2" />
                <Link href={`/players/${p.id}`} className="flex items-center justify-between flex-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">{p.total_games} games · {p.ppg} PPG</span>
                </Link>
              </div>
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
              <div key={t.id} className="flex items-center px-4 py-3 hover:bg-muted/30 transition-colors">
                <FavouriteButton id={t.id} type="team" className="mr-2" />
                <Link href={`/teams/${t.id}`} className="flex items-center justify-between flex-1">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-sm text-muted-foreground">{t.organisation_name || ""}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.organisations.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Building2 className="w-5 h-5 text-accent" /> Organisations
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {results.organisations.map((o) => (
              <Link key={o.id} href={`/organisations/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="font-medium">{o.name}</span>
                <span className="text-sm text-muted-foreground">{o.suburb ? `${o.suburb}, ${o.state}` : o.type || ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && !loading && total === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
