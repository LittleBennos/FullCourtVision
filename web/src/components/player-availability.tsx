"use client";

import { useEffect, useState } from "react";
import { Shield, Activity, TrendingUp, Calendar } from "lucide-react";

interface AvailabilityData {
  player_id: string;
  player_name: string;
  total_games: number;
  total_possible_games: number;
  availability_pct: number;
  longest_streak: number;
  seasons_count: number;
  seasons: Array<{
    season_name: string;
    competition_name: string;
    entries: Array<{
      grade_name: string;
      grade_type: string | null;
      team_name: string;
      games_played: number;
      team_total_games: number;
      availability_pct: number;
    }>;
  }>;
}

export function PlayerAvailability({ playerId }: { playerId: string }) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${playerId}/availability`)
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="h-48 bg-card rounded-xl border border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <p>Loading availability...</p>
        </div>
      </div>
    );
  }

  if (!data || data.total_games === 0) return null;

  const pctColor =
    data.availability_pct >= 90
      ? "text-green-400"
      : data.availability_pct >= 70
        ? "text-yellow-400"
        : "text-red-400";

  const pctBg =
    data.availability_pct >= 90
      ? "bg-green-400"
      : data.availability_pct >= 70
        ? "bg-yellow-400"
        : "bg-red-400";

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-400" />
        Availability
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Availability
          </div>
          <div className={`text-2xl font-bold ${pctColor}`}>{data.availability_pct}%</div>
          <div className="text-xs text-muted-foreground">
            {data.total_games} / {data.total_possible_games} games
          </div>
        </div>
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Best Streak
          </div>
          <div className="text-2xl font-bold text-blue-400">{data.longest_streak}</div>
          <div className="text-xs text-muted-foreground">consecutive games</div>
        </div>
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Seasons
          </div>
          <div className="text-2xl font-bold text-foreground">{data.seasons_count}</div>
          <div className="text-xs text-muted-foreground">competitions</div>
        </div>
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-muted-foreground mb-1">Games Missed</div>
          <div className="text-2xl font-bold text-orange-400">
            {data.total_possible_games - data.total_games}
          </div>
          <div className="text-xs text-muted-foreground">estimated</div>
        </div>
      </div>

      {/* Availability bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall Availability</span>
          <span className={pctColor}>{data.availability_pct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pctBg}`}
            style={{ width: `${data.availability_pct}%` }}
          />
        </div>
      </div>

      {/* Per-season breakdown */}
      {data.seasons.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            By Season
          </h4>
          {data.seasons.map((season, i) => (
            <div key={i} className="space-y-2">
              {season.entries.map((entry, j) => {
                const entryColor =
                  entry.availability_pct >= 90
                    ? "bg-green-400"
                    : entry.availability_pct >= 70
                      ? "bg-yellow-400"
                      : "bg-red-400";
                return (
                  <div key={j} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {season.competition_name} — {season.season_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {entry.grade_name} · {entry.team_name}
                      </div>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${entryColor}`}
                          style={{ width: `${entry.availability_pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium w-20 text-right flex-shrink-0">
                      {entry.games_played}/{entry.team_total_games}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({entry.availability_pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
