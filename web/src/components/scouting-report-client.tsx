"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Printer, ArrowLeft, TrendingUp, TrendingDown, Users, Shield } from "lucide-react";

interface ScoutingData {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    team_name: string;
    grade_name: string;
  };
  averages: { ppg: number; twoPtPg: number; threePtPg: number; fpg: number };
  totalGames: number;
  percentiles: { ppg: number; twoPtPg: number; threePtPg: number; fpg: number };
  strengths: string[];
  weaknesses: string[];
  comparables: {
    id: string;
    first_name: string;
    last_name: string;
    ppg: number;
    twoPtPg: number;
    threePtPg: number;
    fpg: number;
    similarity: number;
  }[];
  seasonTrends: { season: string; ppg: number; games: number }[];
  overallGrade: string;
  composite: number;
  stats: any[];
}

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-amber-400";
  if (grade.startsWith("C")) return "text-orange-400";
  return "text-red-400";
}

function compositeBarColor(val: number) {
  if (val >= 75) return "bg-emerald-500";
  if (val >= 50) return "bg-amber-500";
  if (val >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function ScoutingReportClient({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [data, setData] = useState<ScoutingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/scouting/${playerId}`)
      .then(r => r.json())
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Generating scouting report...</p>
        </div>
      </div>
    );
  }

  if (!data || data.totalGames === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Not enough data to generate a scouting report.</p>
        <Link href={`/players/${playerId}`} className="text-amber-500 hover:underline mt-4 inline-block">
          ← Back to player profile
        </Link>
      </div>
    );
  }

  const radarData = [
    { stat: "Scoring", value: data.percentiles.ppg, fullMark: 100 },
    { stat: "Inside", value: data.percentiles.twoPtPg, fullMark: 100 },
    { stat: "Outside", value: data.percentiles.threePtPg, fullMark: 100 },
    { stat: "Discipline", value: data.percentiles.fpg, fullMark: 100 },
  ];

  return (
    <div className="scouting-report">
      {/* Print Button */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/players/${playerId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Header */}
      <div className="bg-card rounded-xl border border-amber-500/30 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-1">Coach Scouting Report</p>
            <h1 className="text-3xl font-bold">{data.player.first_name} {data.player.last_name}</h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground text-sm">
              <span>{data.player.team_name}</span>
              <span className="text-amber-500/40">|</span>
              <span>{data.player.grade_name}</span>
              <span className="text-amber-500/40">|</span>
              <span>{data.totalGames} games</span>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-black ${gradeColor(data.overallGrade)}`}>
              {data.overallGrade}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Overall Grade</div>
            <div className="w-24 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${compositeBarColor(data.composite)}`}
                style={{ width: `${data.composite}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{data.composite}th percentile</div>
          </div>
        </div>
      </div>

      {/* Stat Summary Table */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Statistical Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "PPG", value: data.averages.ppg, pct: data.percentiles.ppg },
            { label: "2PT/G", value: data.averages.twoPtPg, pct: data.percentiles.twoPtPg },
            { label: "3PT/G", value: data.averages.threePtPg, pct: data.percentiles.threePtPg },
            { label: "Fouls/G", value: data.averages.fpg, pct: data.percentiles.fpg },
          ].map(s => (
            <div key={s.label} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.pct >= 75 ? "bg-emerald-500" : s.pct >= 50 ? "bg-amber-500" : s.pct >= 25 ? "bg-orange-500" : "bg-red-500"}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar + Strengths/Weaknesses row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Radar Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Percentile Profile</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
              <Radar
                name="Percentile"
                dataKey="value"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-emerald-500/20 p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Strengths
            </h2>
            {data.strengths.length > 0 ? (
              <ul className="space-y-2">
                {data.strengths.map(s => (
                  <li key={s} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{s}</span>
                    <span className="text-emerald-400 text-xs ml-auto">Top 25%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No standout strengths identified (all stats below 75th percentile)</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-red-500/20 p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Areas for Development
            </h2>
            {data.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {data.weaknesses.map(w => (
                  <li key={w} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{w}</span>
                    <span className="text-red-400 text-xs ml-auto">Bottom 25%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant weaknesses identified (all stats above 25th percentile)</p>
            )}
          </div>
        </div>
      </div>

      {/* Season Trend Sparkline */}
      {data.seasonTrends.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Season Scoring Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.seasonTrends}>
              <XAxis dataKey="season" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                labelStyle={{ color: "#f59e0b" }}
                itemStyle={{ color: "#f59e0b" }}
              />
              <Line
                type="monotone"
                dataKey="ppg"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                name="PPG"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparable Players */}
      {data.comparables.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Comparable Players
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Based on Euclidean distance of normalized per-game stats (PPG, 2PT, 3PT, Fouls)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.comparables.map(c => (
              <Link
                key={c.id}
                href={`/players/${c.id}`}
                className="group block rounded-lg border border-border bg-slate-950 p-4 transition-all hover:border-amber-500/50 hover:bg-slate-900"
              >
                <div className="font-semibold text-sm group-hover:text-amber-400 transition-colors truncate">
                  {c.first_name} {c.last_name}
                </div>
                <div className="mt-2 text-xl font-bold text-amber-400">{c.similarity}%</div>
                <div className="text-xs text-muted-foreground">similarity</div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>PPG: <span className="text-foreground">{c.ppg}</span></span>
                  <span>FPG: <span className="text-foreground">{c.fpg}</span></span>
                  <span>2PT: <span className="text-foreground">{c.twoPtPg}</span></span>
                  <span>3PT: <span className="text-foreground">{c.threePtPg}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border mt-8">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-3 h-3" />
          Generated by FullCourtVision · Percentiles based on players in the same grade(s)
        </p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .scouting-report { max-width: 100% !important; }
          nav, header, footer { display: none !important; }
          .bg-card { background: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-slate-950 { background: #f1f5f9 !important; }
          .text-muted-foreground { color: #64748b !important; }
          .text-foreground, h1, h2, h3, .font-bold, .font-semibold { color: #0f172a !important; }
          .text-amber-500, .text-amber-400 { color: #d97706 !important; }
          .text-emerald-400 { color: #059669 !important; }
          .text-red-400 { color: #dc2626 !important; }
          .border-amber-500\\/30 { border-color: #d97706 !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
