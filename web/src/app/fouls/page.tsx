"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

interface FoulPlayer {
  player_id: string;
  name: string;
  team: string;
  games: number;
  fouls: number;
  points: number;
  fpg: number;
  ppg: number;
}

interface ScatterPoint {
  fpg: number;
  ppg: number;
  name: string;
  player_id: string;
}

interface HistBucket {
  range: string;
  count: number;
}

interface FoulData {
  foulLeaders: FoulPlayer[];
  disciplined: FoulPlayer[];
  scatterData: ScatterPoint[];
  histogram: HistBucket[];
  summary: { totalPlayers: number; avgFpg: number };
}

const HIST_COLORS = ["#10b981", "#22d3ee", "#f59e0b", "#f97316", "#ef4444", "#dc2626"];

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
      <p className="font-semibold text-amber-400">{d.name}</p>
      <p className="text-slate-300">FPG: {d.fpg} | PPG: {d.ppg}</p>
    </div>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-300">{payload[0].payload.range} FPG: <span className="font-semibold text-amber-400">{payload[0].value} players</span></p>
    </div>
  );
}

export default function FoulsPage() {
  const [data, setData] = useState<FoulData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fouls/analysis")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Failed to load foul analysis data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Fouls Analysis" }]} />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">⚠️ Foul Analysis</h1>
        <p className="text-muted-foreground">
          Deep-dive into foul rates, discipline, and foul-to-scoring correlation across {data.summary.totalPlayers.toLocaleString()} players.
          League average: <span className="text-amber-400 font-semibold">{data.summary.avgFpg} FPG</span>.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Players Analysed</p>
          <p className="text-3xl font-bold text-amber-400">{data.summary.totalPlayers.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Avg Fouls Per Game</p>
          <p className="text-3xl font-bold text-amber-400">{data.summary.avgFpg}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Foul-Out Risk (5+ FPG)</p>
          <p className="text-3xl font-bold text-red-400">
            {data.foulLeaders.filter((p) => p.fpg >= 5).length}
          </p>
        </div>
      </div>

      {/* Scatter Plot: Fouls vs PPG */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Fouls vs Scoring (FPG vs PPG)</h2>
        <p className="text-sm text-muted-foreground mb-4">Do aggressive players score more? Each dot is a player.</p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="fpg" name="FPG" type="number" stroke="#94a3b8" label={{ value: "Fouls Per Game", position: "insideBottom", offset: -5, fill: "#94a3b8" }} />
            <YAxis dataKey="ppg" name="PPG" type="number" stroke="#94a3b8" label={{ value: "Points Per Game", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
            <Tooltip content={<ScatterTooltip />} />
            <Scatter data={data.scatterData} fill="#f59e0b" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Foul Rate Histogram */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Foul Rate Distribution</h2>
        <p className="text-sm text-muted-foreground mb-4">How many players fall into each fouls-per-game bracket.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.histogram} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="range" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.histogram.map((_, i) => (
                <Cell key={i} fill={HIST_COLORS[i % HIST_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Foul Leaders Table */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">🔥 Foul Leaders</h2>
        <p className="text-sm text-muted-foreground mb-4">Players with the highest fouls per game rate (min 5 games).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Player</th>
                <th className="py-2 px-3">Team</th>
                <th className="py-2 px-3 text-center">GP</th>
                <th className="py-2 px-3 text-center">Fouls</th>
                <th className="py-2 px-3 text-center">FPG</th>
                <th className="py-2 px-3 text-center">PPG</th>
              </tr>
            </thead>
            <tbody>
              {data.foulLeaders.slice(0, 25).map((p, i) => (
                <tr key={p.player_id} className="border-b border-border/50 hover:bg-amber-500/5 transition-colors">
                  <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-3">
                    <Link href={`/players/${p.player_id}`} className="text-amber-400 hover:underline font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{p.team}</td>
                  <td className="py-2 px-3 text-center">{p.games}</td>
                  <td className="py-2 px-3 text-center">{p.fouls}</td>
                  <td className="py-2 px-3 text-center font-semibold text-red-400">{p.fpg}</td>
                  <td className="py-2 px-3 text-center">{p.ppg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Disciplined */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">🧘 Most Disciplined Players</h2>
        <p className="text-sm text-muted-foreground mb-4">Lowest foul rate among players with 10+ games and scoring output.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Player</th>
                <th className="py-2 px-3">Team</th>
                <th className="py-2 px-3 text-center">GP</th>
                <th className="py-2 px-3 text-center">Fouls</th>
                <th className="py-2 px-3 text-center">FPG</th>
                <th className="py-2 px-3 text-center">PPG</th>
              </tr>
            </thead>
            <tbody>
              {data.disciplined.slice(0, 25).map((p, i) => (
                <tr key={p.player_id} className="border-b border-border/50 hover:bg-emerald-500/5 transition-colors">
                  <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-3">
                    <Link href={`/players/${p.player_id}`} className="text-emerald-400 hover:underline font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{p.team}</td>
                  <td className="py-2 px-3 text-center">{p.games}</td>
                  <td className="py-2 px-3 text-center">{p.fouls}</td>
                  <td className="py-2 px-3 text-center font-semibold text-emerald-400">{p.fpg}</td>
                  <td className="py-2 px-3 text-center">{p.ppg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
