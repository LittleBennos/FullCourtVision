"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ChevronDown, Loader2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  wins: number;
  losses: number;
  games_played: number;
  win_pct: number;
  seed: number | null;
  playoff: boolean;
}

interface Conference {
  id: string;
  name: string;
  season_id: string;
  season_name: string;
  teams: Team[];
}

interface ApiResponse {
  data: Conference[];
  meta: { playoff_size: number; total_conferences: number };
}

export function ConferencesClient() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [playoffSize, setPlayoffSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedConfs, setExpandedConfs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/conferences?playoff_size=${playoffSize}`)
      .then((r) => r.json())
      .then((res: ApiResponse) => {
        setConferences(res.data);
        // Auto-expand first 3
        const first = new Set(res.data.slice(0, 3).map((c) => `${c.id}_${c.season_id}`));
        setExpandedConfs(first);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [playoffSize]);

  const toggleConf = (key: string) => {
    setExpandedConfs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conference Standings</h1>
            <p className="text-sm text-muted-foreground">
              {conferences.length} conferences · Top {playoffSize} teams qualify for playoffs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Playoff spots:</label>
          <select
            value={playoffSize}
            onChange={(e) => setPlayoffSize(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-white"
          >
            {[2, 3, 4, 6, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conference cards */}
      <div className="grid gap-4">
        {conferences.map((conf) => {
          const key = `${conf.id}_${conf.season_id}`;
          const isExpanded = expandedConfs.has(key);
          return (
            <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Conference header */}
              <button
                onClick={() => toggleConf(key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-accent" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-white">{conf.name}</h2>
                    <p className="text-xs text-muted-foreground">{conf.season_name} · {conf.teams.length} teams</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Standings table */}
              {isExpanded && (
                <div className="px-5 pb-4 overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-slate-800">
                        <th className="text-left py-2 w-10">Seed</th>
                        <th className="text-left py-2">Team</th>
                        <th className="text-center py-2 w-12">W</th>
                        <th className="text-center py-2 w-12">L</th>
                        <th className="text-center py-2 w-14">GP</th>
                        <th className="text-right py-2 w-16">Win%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conf.teams.map((team, idx) => {
                        const isPlayoffLine = idx === playoffSize - 1 && idx < conf.teams.length - 1;
                        return (
                          <tr key={team.id}>
                            <td className={`py-2.5 ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""}`}>
                              {team.playoff ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                                  {team.seed}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground text-xs">
                                  {team.seed}
                                </span>
                              )}
                            </td>
                            <td className={`py-2.5 font-medium ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""}`}>
                              <Link href={`/teams/${team.id}`} className="text-white hover:text-accent transition-colors">
                                {team.name}
                              </Link>
                            </td>
                            <td className={`py-2.5 text-center text-emerald-400 font-medium ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""}`}>
                              {team.wins}
                            </td>
                            <td className={`py-2.5 text-center text-red-400 font-medium ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""}`}>
                              {team.losses}
                            </td>
                            <td className={`py-2.5 text-center text-muted-foreground ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""}`}>
                              {team.games_played}
                            </td>
                            <td className={`py-2.5 text-right font-mono ${isPlayoffLine ? "border-b-2 border-amber-500/60" : ""} ${team.win_pct >= 0.6 ? "text-emerald-400" : team.win_pct <= 0.4 ? "text-red-400" : "text-white"}`}>
                              {team.win_pct.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {conf.teams.length > playoffSize && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-4 h-0.5 bg-amber-500/60" />
                      <span>Playoff cutoff line</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
