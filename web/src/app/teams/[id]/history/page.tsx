"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { History, UserPlus, UserMinus, Users, ArrowLeft, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  games_played: number;
  total_points: number;
}

interface SeasonData {
  season_id: string;
  season_name: string;
  team_id: string;
  roster: Player[];
  joined: Player[];
  departed: Player[];
  retained: Player[];
  roster_size: number;
}

interface HistoryData {
  team_name: string;
  organisation_name: string;
  current_team_id: string;
  seasons: SeasonData[];
}

function PlayerLink({ player }: { player: Player }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="text-amber-500 hover:text-amber-400 hover:underline transition-colors"
    >
      {player.first_name} {player.last_name}
    </Link>
  );
}

function PlayerBadge({ player, variant }: { player: Player; variant: "joined" | "departed" | "retained" }) {
  const colors = {
    joined: "bg-green-500/10 border-green-500/30 text-green-400",
    departed: "bg-red-500/10 border-red-500/30 text-red-400",
    retained: "bg-slate-700/50 border-slate-600/30 text-slate-300",
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${colors[variant]}`}>
      <PlayerLink player={player} />
      <span className="text-xs opacity-60">
        {player.games_played}GP · {player.total_points}pts
      </span>
    </div>
  );
}

export default function RosterHistoryPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teams/${id}/history`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch(() => setError("Failed to load roster history"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400">
          {error || "Failed to load roster history"}
        </div>
      </div>
    );
  }

  const hasMutlipleSeasons = data.seasons.length > 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Teams", href: "/teams" },
          { label: data.team_name, href: `/teams/${id}` },
          { label: "Roster History" },
        ]}
      />

      {/* Header */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-bold">Roster History</h1>
        </div>
        <p className="text-slate-400">
          {data.team_name} · {data.organisation_name}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {data.seasons.length} season{data.seasons.length !== 1 ? "s" : ""} tracked
        </p>
      </div>

      {!hasMutlipleSeasons && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 mb-8 text-center text-slate-400">
          <p>Only one season of data available for this team. Roster changes will appear when more seasons are recorded.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-800 hidden md:block" />

        <div className="space-y-6">
          {data.seasons.map((season, idx) => (
            <div key={season.season_id} className="relative md:pl-16">
              {/* Timeline dot */}
              <div className="absolute left-4 top-6 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-950 hidden md:block z-10" />

              <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                {/* Season header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/teams/${season.team_id}`}
                      className="text-lg font-semibold text-amber-500 hover:text-amber-400 hover:underline transition-colors"
                    >
                      {season.season_name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {season.roster_size} players
                      </span>
                      {idx > 0 && season.joined.length > 0 && (
                        <span className="flex items-center gap-1 text-green-400">
                          <UserPlus className="w-3.5 h-3.5" />
                          +{season.joined.length}
                        </span>
                      )}
                      {idx > 0 && season.departed.length > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <UserMinus className="w-3.5 h-3.5" />
                          -{season.departed.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {season.team_id === id && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">
                      Current
                    </span>
                  )}
                </div>

                {/* Changes section (for seasons after the first) */}
                {idx > 0 && (season.joined.length > 0 || season.departed.length > 0) && (
                  <div className="px-6 py-4 border-b border-slate-800 space-y-3">
                    {season.joined.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          Joined ({season.joined.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {season.joined.map((p) => (
                            <PlayerBadge key={p.id} player={p} variant="joined" />
                          ))}
                        </div>
                      </div>
                    )}
                    {season.departed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <UserMinus className="w-3.5 h-3.5" />
                          Departed ({season.departed.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {season.departed.map((p) => (
                            <PlayerBadge key={p.id} player={p} variant="departed" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full roster */}
                <details className="group">
                  <summary className="px-6 py-3 text-sm text-slate-400 hover:text-slate-300 cursor-pointer select-none transition-colors">
                    <span className="ml-1">View full roster ({season.roster_size})</span>
                  </summary>
                  <div className="px-6 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase tracking-wider">
                            <th className="text-left py-2 pr-4">Player</th>
                            <th className="text-right py-2 px-2">GP</th>
                            <th className="text-right py-2 px-2">PTS</th>
                            <th className="text-right py-2 pl-2">PPG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {season.roster.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2 pr-4">
                                <PlayerLink player={p} />
                                {idx > 0 && season.joined.some(j => j.id === p.id) && (
                                  <span className="ml-2 text-xs text-green-400">NEW</span>
                                )}
                              </td>
                              <td className="text-right py-2 px-2 tabular-nums text-slate-400">{p.games_played}</td>
                              <td className="text-right py-2 px-2 tabular-nums font-medium">{p.total_points}</td>
                              <td className="text-right py-2 pl-2 tabular-nums text-amber-500">
                                {p.games_played > 0 ? (p.total_points / p.games_played).toFixed(1) : "0.0"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link
          href={`/teams/${id}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to team
        </Link>
      </div>
    </div>
  );
}
