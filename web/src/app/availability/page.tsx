"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Trophy, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface PlayerAvailRow {
  player_id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  total_possible: number;
  availability_pct: number;
  longest_streak: number;
  games_missed: number;
}

function RankingTable({ rows, highlight }: { rows: PlayerAvailRow[]; highlight: "pct" | "streak" | "missed" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">#</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Player</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">GP</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Possible</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Avail %</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Best Streak</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Missed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.player_id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4 text-sm text-muted-foreground">{i + 1}</td>
              <td className="py-3 px-4">
                <Link
                  href={`/players/${row.player_id}`}
                  className="text-sm font-medium hover:text-blue-400 transition-colors"
                >
                  {row.first_name} {row.last_name}
                </Link>
              </td>
              <td className="text-center py-3 px-4 text-sm">{row.total_games}</td>
              <td className="text-center py-3 px-4 text-sm text-muted-foreground">{row.total_possible}</td>
              <td className={`text-center py-3 px-4 text-sm font-semibold ${highlight === "pct" ? (row.availability_pct >= 90 ? "text-green-400" : row.availability_pct >= 70 ? "text-yellow-400" : "text-red-400") : ""}`}>
                {row.availability_pct}%
              </td>
              <td className={`text-center py-3 px-4 text-sm ${highlight === "streak" ? "font-semibold text-blue-400" : ""}`}>
                {row.longest_streak}
              </td>
              <td className={`text-center py-3 px-4 text-sm ${highlight === "missed" ? "font-semibold text-orange-400" : ""}`}>
                {row.games_missed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AvailabilityPage() {
  const [data, setData] = useState<{
    mostAvailable: PlayerAvailRow[];
    ironMan: PlayerAvailRow[];
    mostMissed: PlayerAvailRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Availability" }]} />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Availability Rankings</h1>
        <p className="text-muted-foreground">
          Player availability analysis across all Basketball Victoria competitions.
          Availability percentage is calculated by comparing games played vs. estimated team total games.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center text-muted-foreground">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <p>Crunching availability data...</p>
          </div>
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-center py-20">Failed to load availability data.</p>
      ) : (
        <>
          {/* Most Available */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Most Available Players
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Players with the highest availability percentage (min. 5 games)
            </p>
            <RankingTable rows={data.mostAvailable} highlight="pct" />
          </div>

          {/* Iron Man */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-400" />
              Iron Man Streaks
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Most consecutive games played in a single competition entry
            </p>
            <RankingTable rows={data.ironMan} highlight="streak" />
          </div>

          {/* Most Games Missed */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Most Games Missed
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Players with the most estimated missed games across all competitions
            </p>
            <RankingTable rows={data.mostMissed} highlight="missed" />
          </div>
        </>
      )}
    </div>
  );
}
