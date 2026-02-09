"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ClutchPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  clutch_rating: number;
  overall_ppg: number;
  close_game_wins: number;
  close_game_losses: number;
  close_games: number;
  total_games: number;
}

interface Summary {
  total_close_games: number;
  avg_margin: number;
  most_clutch_team: { name: string; wins: number; losses: number; rate: number } | null;
}

export default function ClutchPage() {
  const [players, setPlayers] = useState<ClutchPlayer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clutch")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data.players || []);
        setSummary(data.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = players.slice(0, 20).map((p) => ({
    name: `${p.first_name} ${p.last_name.charAt(0)}.`,
    rating: p.clutch_rating,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Clutch Performance" }]} />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🔥 Clutch Performance</h1>
        <p className="text-muted-foreground">
          Players who perform when it matters most. Clutch rating combines scoring,
          close-game win rate, and volume in games decided by 5 points or fewer.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">Total Close Games</p>
            <p className="text-3xl font-bold text-amber-400">{summary.total_close_games}</p>
            <p className="text-xs text-muted-foreground mt-1">Decided by ≤5 points</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">Avg Close-Game Margin</p>
            <p className="text-3xl font-bold text-amber-400">{summary.avg_margin}</p>
            <p className="text-xs text-muted-foreground mt-1">Points</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">Most Clutch Team</p>
            <p className="text-xl font-bold text-amber-400 truncate">
              {summary.most_clutch_team?.name || "—"}
            </p>
            {summary.most_clutch_team && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.most_clutch_team.wins}W-{summary.most_clutch_team.losses}L in close games
                ({(summary.most_clutch_team.rate * 100).toFixed(0)}%)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">Top 20 Clutch Performers</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                interval={0}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#F59E0B" }}
                itemStyle={{ color: "#FCD34D" }}
              />
              <Bar dataKey="rating" name="Clutch Rating" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No clutch data available yet.</p>
          <p className="text-sm mt-1">Close games need completed scores to calculate clutch ratings.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium text-right">Clutch Rating</th>
                  <th className="px-4 py-3 font-medium text-right">Overall PPG</th>
                  <th className="px-4 py-3 font-medium text-right">Close W-L</th>
                  <th className="px-4 py-3 font-medium text-right">Close Games</th>
                  <th className="px-4 py-3 font-medium text-right">Total Games</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.player_id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${p.player_id}`}
                        className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400">
                      {p.clutch_rating}
                    </td>
                    <td className="px-4 py-3 text-right">{p.overall_ppg}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-400">{p.close_game_wins}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-red-400">{p.close_game_losses}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{p.close_games}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.total_games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
