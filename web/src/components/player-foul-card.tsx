"use client";

import { AlertTriangle, TrendingDown, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";

interface PlayerFoulCardProps {
  totalFouls: number;
  totalGames: number;
  foulsPg: number;
  stats: { games_played: number; total_fouls: number; season_name?: string }[];
}

export function PlayerFoulCard({ totalFouls, totalGames, foulsPg, stats }: PlayerFoulCardProps) {
  // Compute trend from first half vs second half of entries
  const half = Math.ceil(stats.length / 2);
  const firstHalf = stats.slice(0, half);
  const secondHalf = stats.slice(half);

  const avgFirst = firstHalf.length > 0
    ? firstHalf.reduce((s, st) => s + (st.total_fouls || 0), 0) / firstHalf.reduce((s, st) => s + (st.games_played || 0), 0) || 0
    : 0;
  const avgSecond = secondHalf.length > 0
    ? secondHalf.reduce((s, st) => s + (st.total_fouls || 0), 0) / secondHalf.reduce((s, st) => s + (st.games_played || 0), 0) || 0
    : 0;

  const trend = avgSecond - avgFirst;
  const improving = trend < -0.2;
  const worsening = trend > 0.2;

  // Risk level
  const risk = foulsPg >= 4 ? "high" : foulsPg >= 2.5 ? "moderate" : "low";
  const riskColors = {
    high: "text-red-400 bg-red-500/10 border-red-500/30",
    moderate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  };
  const riskLabels = { high: "High Risk", moderate: "Moderate", low: "Disciplined" };

  if (totalGames < 3) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Foul Profile
        </h3>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${riskColors[risk]}`}>
          {riskLabels[risk]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-muted-foreground">FPG</p>
          <p className="text-xl font-bold">{foulsPg}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{totalFouls}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trend</p>
          <div className="flex items-center gap-1">
            {improving ? (
              <>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Improving</span>
              </>
            ) : worsening ? (
              <>
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">Worsening</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-sm font-medium">Stable</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Link href="/fouls" className="text-xs text-amber-400 hover:underline">
        View full foul analysis →
      </Link>
    </div>
  );
}
