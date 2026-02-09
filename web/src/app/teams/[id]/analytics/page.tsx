"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Shield, Zap, Target, Flame, BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend, Area, AreaChart,
} from "recharts";

interface Summary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  pace: number;
  pointDifferential: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: string;
  last5: string[];
}

interface FormPoint {
  date: string;
  result: "W" | "L";
  teamScore: number;
  oppScore: number;
  opponent: string;
  cumulativeWins: number;
  cumulativeLosses: number;
}

interface H2HRow {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
}

interface TopScorer {
  id: string;
  name: string;
  ppg: number;
  total_points: number;
  games_played: number;
}

interface AnalyticsData {
  team: { id: string; name: string; organisationName: string; seasonName: string };
  summary: Summary;
  formOverTime: FormPoint[];
  h2hMatrix: H2HRow[];
  topScorers: TopScorer[];
}

export default function TeamAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teams/${id}/analytics`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setData(j.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-red-400">Failed to load analytics: {error || "Unknown error"}</p>
        <Link href={`/teams/${id}`} className="text-accent hover:underline mt-4 inline-block">← Back to team</Link>
      </div>
    );
  }

  const { team, summary: s, formOverTime, h2hMatrix, topScorers } = data;

  // Chart data: rolling win% over games
  const formChartData = formOverTime.map((f, i) => ({
    game: i + 1,
    date: new Date(f.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    winPct: +((f.cumulativeWins / (i + 1)) * 100).toFixed(1),
    margin: f.teamScore - f.oppScore,
    result: f.result,
    opponent: f.opponent,
    teamScore: f.teamScore,
    oppScore: f.oppScore,
  }));

  // Efficiency comparison data
  const efficiencyData = [
    { name: "Offensive (PPG)", value: s.offensiveEfficiency, fill: "#f59e0b" },
    { name: "Defensive (Opp PPG)", value: s.defensiveEfficiency, fill: "#ef4444" },
    { name: "Pace (Total PPG)", value: s.pace, fill: "#8b5cf6" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to {team.name}
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">{team.organisationName} · {team.seasonName} · Advanced Analytics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={<Target className="w-5 h-5" />} label="Win Rate" value={`${s.winPct}%`} subtext={`${s.wins}W - ${s.losses}L`} color="text-amber-400" />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Offensive PPG" value={String(s.offensiveEfficiency)} subtext="Points per game" color="text-amber-400" />
        <MetricCard icon={<Shield className="w-5 h-5" />} label="Defensive PPG" value={String(s.defensiveEfficiency)} subtext="Opponent PPG" color="text-red-400" />
        <MetricCard icon={<Zap className="w-5 h-5" />} label="Pace" value={String(s.pace)} subtext="Total points/game" color="text-purple-400" />
        <MetricCard icon={<Flame className="w-5 h-5" />} label="Current Streak" value={s.currentStreak} subtext={`Best: ${s.longestWinStreak}W`} color="text-green-400" />
        <MetricCard icon={<BarChart3 className="w-5 h-5" />} label="Point Diff" value={s.pointDifferential > 0 ? `+${s.pointDifferential}` : String(s.pointDifferential)} subtext="Total margin" color={s.pointDifferential >= 0 ? "text-green-400" : "text-red-400"} />
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Last 5 Games</p>
          <div className="flex gap-1.5">
            {s.last5.map((r, i) => (
              <span key={i} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold ${r === "W" ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"}`}>
                {r}
              </span>
            ))}
          </div>
        </div>
        <MetricCard icon={<Target className="w-5 h-5" />} label="Games Played" value={String(s.gamesPlayed)} subtext={`${s.longestLossStreak} worst streak`} color="text-muted-foreground" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Win% over time */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Win Rate Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={formChartData}>
              <defs>
                <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#f59e0b" }}
                formatter={(v: any) => [`${v}%`, "Win Rate"]}
              />
              <Area type="monotone" dataKey="winPct" stroke="#f59e0b" strokeWidth={2} fill="url(#winGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Game margins */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Game Margins</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={formChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#f59e0b" }}
                formatter={(v: any, _: any, entry: any) => [
                  `${entry?.payload?.teamScore} - ${entry?.payload?.oppScore} vs ${entry?.payload?.opponent}`,
                  v > 0 ? "Win" : "Loss",
                ]}
              />
              <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                {formChartData.map((d, i) => (
                  <Cell key={i} fill={d.result === "W" ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Efficiency Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={efficiencyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#888" }} width={130} />
              <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {efficiencyData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Scorers */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Top Scorers</h2>
          {topScorers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No player data available.</p>
          ) : (
            <div className="space-y-3">
              {topScorers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <Link href={`/players/${p.id}`} className="text-accent hover:underline font-medium flex-1 truncate">
                    {p.name}
                  </Link>
                  <span className="text-sm tabular-nums font-semibold text-amber-400">{p.ppg} PPG</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{p.games_played} GP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Win Streak Timeline */}
      {formOverTime.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Result Timeline</h2>
          <div className="flex flex-wrap gap-1.5">
            {formOverTime.map((f, i) => (
              <div key={i} className="group relative">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold cursor-default ${
                  f.result === "W" ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"
                }`}>
                  {f.result}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover border border-border rounded-lg p-2 text-xs whitespace-nowrap z-10 shadow-lg">
                  <p className="font-medium">{f.teamScore} - {f.oppScore} vs {f.opponent}</p>
                  <p className="text-muted-foreground">{new Date(f.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* H2H Matrix */}
      {h2hMatrix.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Head-to-Head Record</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Opponent</th>
                  <th className="text-right px-4 py-3 font-medium">W</th>
                  <th className="text-right px-4 py-3 font-medium">L</th>
                  <th className="text-right px-4 py-3 font-medium">PF</th>
                  <th className="text-right px-4 py-3 font-medium">PA</th>
                  <th className="text-right px-4 py-3 font-medium">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {h2hMatrix.map((row) => (
                  <tr key={row.opponentId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/teams/${row.opponentId}`} className="text-accent hover:underline font-medium">
                        {row.opponentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-400">{row.wins}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-400">{row.losses}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.pointsFor}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.pointsAgainst}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${row.differential > 0 ? "text-green-400" : row.differential < 0 ? "text-red-400" : ""}`}>
                      {row.differential > 0 ? "+" : ""}{row.differential}
                    </td>
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

function MetricCard({ icon, label, value, subtext, color }: { icon: React.ReactNode; label: string; value: string; subtext: string; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
    </div>
  );
}
