"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Users, Trophy, Zap } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

interface Player { id: string; name: string; archetype: string; ppg: number; gamesPlayed: number }
interface Pair { player1: string; player2: string; p1Name: string; p2Name: string; score: number; reason: string }
interface LineupPlayer { id: string; name: string; archetype: string; ppg: number }
interface ChemistryData {
  teamName: string;
  players: Player[];
  pairs: Pair[];
  overallScore: number;
  archetypeBreakdown: { name: string; count: number }[];
  bestLineup: LineupPlayer[];
}

const ARCHETYPE_COLORS: Record<string, string> = {
  Sharpshooter: "#3b82f6",
  Scorer: "#f59e0b",
  Enforcer: "#ef4444",
  "All-Rounder": "#10b981",
  "Role Player": "#8b5cf6",
  "Free-Throw Merchant": "#ec4899",
  "Bench Contributor": "#6b7280",
};

function scoreColor(score: number): string {
  if (score >= 0.85) return "text-green-400";
  if (score >= 0.7) return "text-blue-400";
  if (score >= 0.55) return "text-yellow-400";
  return "text-red-400";
}

function overallColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 65) return "text-blue-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export default function ChemistryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ChemistryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${id}/chemistry`)
      .then(r => r.json())
      .then(j => setData(j.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-800 rounded" />
          <div className="h-64 bg-slate-800 rounded-xl" />
          <div className="h-96 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || data.players.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 text-blue-400 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Team
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No player data available for chemistry analysis.</p>
        </div>
      </div>
    );
  }

  // Build radar data from archetypes (fill missing with 0)
  const allArchetypes = ["Sharpshooter", "Scorer", "Enforcer", "All-Rounder", "Role Player", "Free-Throw Merchant", "Bench Contributor"];
  const archetypeMap = Object.fromEntries(data.archetypeBreakdown.map(a => [a.name, a.count]));
  const radarData = allArchetypes.map(name => ({
    archetype: name.replace("Free-Throw ", "FT ").replace("Bench ", "Bench\n"),
    count: archetypeMap[name] || 0,
    fullMark: Math.max(...data.archetypeBreakdown.map(a => a.count), 3),
  }));

  // Matrix data: build player x player grid
  const topPlayers = data.players.slice(0, 8);
  const pairMap = new Map<string, Pair>();
  for (const p of data.pairs) {
    pairMap.set(`${p.player1}-${p.player2}`, p);
    pairMap.set(`${p.player2}-${p.player1}`, p);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 text-blue-400 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Team
      </Link>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-blue-400" />
              <h1 className="text-2xl md:text-3xl font-bold">Team Chemistry</h1>
            </div>
            <p className="text-slate-400 mt-1">{data.teamName}</p>
          </div>
          <div className="text-center">
            <p className={`text-5xl font-bold ${overallColor(data.overallScore)}`}>{data.overallScore}</p>
            <p className="text-sm text-slate-400">Overall Chemistry Score</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Archetype Balance Wheel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Archetype Balance</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="archetype" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar name="Players" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-4">
            {data.archetypeBreakdown.sort((a, b) => b.count - a.count).map(a => (
              <span key={a.name} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${ARCHETYPE_COLORS[a.name] || "#6b7280"}20`, color: ARCHETYPE_COLORS[a.name] || "#6b7280" }}>
                {a.name} ({a.count})
              </span>
            ))}
          </div>
        </div>

        {/* Best Lineup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Best Lineup Suggestion</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Top 5 players optimized for archetype diversity and synergy.</p>
          <div className="space-y-3">
            {data.bestLineup.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                <span className="text-lg font-bold text-slate-500 w-6">{i + 1}</span>
                <div className="flex-1">
                  <Link href={`/players/${p.id}`} className="text-blue-400 hover:underline font-medium">{p.name}</Link>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ARCHETYPE_COLORS[p.archetype] || "#6b7280"}20`, color: ARCHETYPE_COLORS[p.archetype] || "#6b7280" }}>
                    {p.archetype}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{p.ppg} PPG</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player Archetypes Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Player Scoring Profiles</h2>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(200, data.players.length * 36)}>
          <BarChart data={data.players} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} width={95} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value} PPG`, "Scoring"]}
            />
            <Bar dataKey="ppg" radius={[0, 4, 4, 0]}>
              {data.players.map(p => (
                <Cell key={p.id} fill={ARCHETYPE_COLORS[p.archetype] || "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chemistry Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Synergy Matrix</h2>
          <span className="text-xs text-slate-400">(Top {topPlayers.length} players)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-slate-400 font-medium" />
                {topPlayers.map(p => (
                  <th key={p.id} className="p-2 text-center text-slate-400 font-medium truncate max-w-[80px]" title={p.name}>
                    {p.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPlayers.map(row => (
                <tr key={row.id}>
                  <td className="p-2 font-medium text-slate-300 truncate max-w-[100px]" title={row.name}>
                    {row.name.split(" ")[0]}
                  </td>
                  {topPlayers.map(col => {
                    if (row.id === col.id) {
                      return <td key={col.id} className="p-2 text-center text-slate-600">—</td>;
                    }
                    const pair = pairMap.get(`${row.id}-${col.id}`);
                    const score = pair?.score ?? 0.5;
                    const bg = score >= 0.85 ? "bg-green-500/20" : score >= 0.7 ? "bg-blue-500/20" : score >= 0.55 ? "bg-yellow-500/20" : "bg-red-500/20";
                    return (
                      <td key={col.id} className={`p-2 text-center ${bg} ${scoreColor(score)} font-semibold cursor-default`} title={pair?.reason || ""}>
                        {(score * 100).toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30" /> 85+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/30" /> 70-84</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30" /> 55-69</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30" /> &lt;55</span>
        </div>
      </div>

      {/* Top Pairs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top Chemistry Pairs</h2>
        <div className="space-y-2">
          {data.pairs.slice(0, 15).map((pair, i) => (
            <div key={`${pair.player1}-${pair.player2}`} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              <span className="text-sm font-bold text-slate-500 w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/players/${pair.player1}`} className="text-blue-400 hover:underline text-sm font-medium">{pair.p1Name}</Link>
                  <span className="text-slate-500">×</span>
                  <Link href={`/players/${pair.player2}`} className="text-blue-400 hover:underline text-sm font-medium">{pair.p2Name}</Link>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{pair.reason}</p>
              </div>
              <span className={`text-lg font-bold tabular-nums ${scoreColor(pair.score)}`}>{(pair.score * 100).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
