"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReportCardData {
  player: { id: string; first_name: string; last_name: string };
  currentArchetype: string;
  archetypeHistory: { season: string; archetype: string }[];
  careerStats: {
    totalGames: number;
    totalPoints: number;
    ppg: number;
    twoPtPg: number;
    threePtPg: number;
    foulsPg: number;
  };
  ppgGrowth: number;
  percentiles: {
    scoring: number;
    efficiency: number;
    threePoint: number;
    experience: number;
    discipline: number;
  };
  radarData: { label: string; value: number }[];
  strengths: string[];
  weaknesses: string[];
  composite: number;
  overallGrade: string;
  seasonProgression: {
    label: string;
    ppg: number;
    twoPtPg: number;
    threePtPg: number;
    foulsPg: number;
    gamesPlayed: number;
  }[];
}

const ARCHETYPE_STYLES: Record<string, { icon: string; color: string }> = {
  "Sharpshooter": { icon: "🎯", color: "#ffc300" },
  "Inside Scorer": { icon: "💪", color: "#e94560" },
  "High Volume": { icon: "🔥", color: "#00d2ff" },
  "Physical": { icon: "🛡️", color: "#7b2ff7" },
  "Balanced": { icon: "⚖️", color: "#2ecc71" },
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "#22c55e", A: "#22c55e",
  "B+": "#84cc16", B: "#84cc16",
  "C+": "#eab308", C: "#eab308",
  D: "#f97316", F: "#ef4444",
};

function GradeBadge({ grade, size = "lg" }: { grade: string; size?: "sm" | "lg" }) {
  const color = GRADE_COLORS[grade] || "#94a3b8";
  const sizeClass = size === "lg" ? "w-24 h-24 text-4xl" : "w-12 h-12 text-xl";
  return (
    <div
      className={`${sizeClass} rounded-2xl flex items-center justify-center font-black border-2`}
      style={{ borderColor: color, color, backgroundColor: `${color}15` }}
    >
      {grade}
    </div>
  );
}

function PercentileBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "#22c55e" : value >= 50 ? "#eab308" : value >= 25 ? "#f97316" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}th</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ReportCardClient({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [data, setData] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/players/${playerId}/report-card`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch(() => setError("Failed to load report card"))
      .finally(() => setLoading(false));
  }, [playerId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!data) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    // Dark background
    doc.setFillColor(15, 23, 42); // slate-950
    doc.rect(0, 0, w, 297, "F");

    // Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, w, 45, "F");

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("FULLCOURTVISION", 15, 20);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`${data.player.first_name} ${data.player.last_name}`, 15, 35);

    // Archetype
    const arch = ARCHETYPE_STYLES[data.currentArchetype];
    doc.setFontSize(12);
    doc.setTextColor(parseInt((arch?.color || "#94a3b8").slice(1, 3), 16), parseInt((arch?.color || "#94a3b8").slice(3, 5), 16), parseInt((arch?.color || "#94a3b8").slice(5, 7), 16));
    doc.text(`${data.currentArchetype}`, w - 15, 20, { align: "right" });

    // Grade
    const gc = GRADE_COLORS[data.overallGrade] || "#94a3b8";
    doc.setFontSize(36);
    doc.setTextColor(parseInt(gc.slice(1, 3), 16), parseInt(gc.slice(3, 5), 16), parseInt(gc.slice(5, 7), 16));
    doc.text(data.overallGrade, w - 15, 40, { align: "right" });

    let y = 58;

    // Career stats
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Career Stats", 15, y);
    y += 8;

    doc.setTextColor(203, 213, 225); // slate-300
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const statsText = [
      `Games: ${data.careerStats.totalGames}`,
      `PPG: ${data.careerStats.ppg}`,
      `2PT/G: ${data.careerStats.twoPtPg}`,
      `3PT/G: ${data.careerStats.threePtPg}`,
      `Fouls/G: ${data.careerStats.foulsPg}`,
    ];
    doc.text(statsText.join("   |   "), 15, y);
    y += 12;

    // Percentile Rankings
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Percentile Rankings (vs Grade Peers)", 15, y);
    y += 8;

    const pEntries = Object.entries(data.percentiles) as [string, number][];
    for (const [key, val] of pEntries) {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
      // Bar background
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y - 3, w - 30, 6, "F");
      // Bar fill
      const barColor = val >= 75 ? [34, 197, 94] : val >= 50 ? [234, 179, 8] : val >= 25 ? [249, 115, 22] : [239, 68, 68];
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(15, y - 3, (w - 30) * (val / 100), 6, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`${label}: ${val}th`, 17, y + 1);
      y += 10;
    }
    y += 5;

    // Strengths & Weaknesses
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Analysis", 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (data.strengths.length > 0) {
      doc.setTextColor(34, 197, 94);
      doc.text(`Strengths: ${data.strengths.join(", ")}`, 15, y);
      y += 6;
    }
    if (data.weaknesses.length > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(`Areas to Improve: ${data.weaknesses.join(", ")}`, 15, y);
      y += 6;
    }

    doc.setTextColor(203, 213, 225);
    doc.text(`PPG Growth (latest): ${data.ppgGrowth > 0 ? "+" : ""}${data.ppgGrowth}`, 15, y);
    y += 6;
    doc.text(`Composite Score: ${data.composite}/100`, 15, y);
    y += 12;

    // Season progression table
    if (data.seasonProgression.length > 0) {
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Season Progression", 15, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(148, 163, 184);
      const cols = ["Season", "GP", "PPG", "2PT/G", "3PT/G", "Fouls/G"];
      const colX = [15, 85, 105, 125, 145, 165];
      cols.forEach((c, i) => doc.text(c, colX[i], y));
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225);
      for (const sp of data.seasonProgression) {
        if (y > 280) break;
        const shortened = sp.label.length > 30 ? sp.label.slice(0, 30) + "…" : sp.label;
        doc.text(shortened, 15, y);
        doc.text(String(sp.gamesPlayed), 85, y);
        doc.text(String(sp.ppg), 105, y);
        doc.text(String(sp.twoPtPg), 125, y);
        doc.text(String(sp.threePtPg), 145, y);
        doc.text(String(sp.foulsPg), 165, y);
        y += 5;
      }
    }

    // Footer
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`Generated by FullCourtVision — ${new Date().toLocaleDateString()}`, 15, 290);

    doc.save(`${data.player.first_name}_${data.player.last_name}_Report_Card.pdf`);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Generating report card...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg mb-4">{error || "Failed to load report card"}</p>
        <Link href={`/players/${playerId}`} className="text-amber-500 hover:underline">
          ← Back to player profile
        </Link>
      </div>
    );
  }

  const archStyle = ARCHETYPE_STYLES[data.currentArchetype] || { icon: "⚖️", color: "#94a3b8" };

  return (
    <div ref={reportRef} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/players/${playerId}`}
              className="text-slate-400 hover:text-amber-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">{playerName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                color: archStyle.color,
                backgroundColor: `${archStyle.color}15`,
                border: `1px solid ${archStyle.color}66`,
              }}
            >
              <span>{archStyle.icon}</span>
              {data.currentArchetype}
            </span>
            <span className="text-slate-400 text-sm">
              {data.careerStats.totalGames} games · {data.careerStats.totalPoints} career pts
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <GradeBadge grade={data.overallGrade} />
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Composite + Growth */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-center">
          <div className="text-sm text-slate-400 mb-1">Composite Score</div>
          <div className="text-3xl font-bold text-white">{data.composite}<span className="text-lg text-slate-500">/100</span></div>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-center">
          <div className="text-sm text-slate-400 mb-1">PPG Growth</div>
          <div className="flex items-center justify-center gap-2">
            {data.ppgGrowth > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : data.ppgGrowth < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-500" />
            ) : null}
            <span className={`text-3xl font-bold ${data.ppgGrowth > 0 ? "text-green-500" : data.ppgGrowth < 0 ? "text-red-500" : "text-slate-400"}`}>
              {data.ppgGrowth > 0 ? "+" : ""}{data.ppgGrowth}
            </span>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-center">
          <div className="text-sm text-slate-400 mb-1">Points Per Game</div>
          <div className="text-3xl font-bold text-amber-500">{data.careerStats.ppg}</div>
        </div>
      </div>

      {/* Radar + Percentiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-500">Strengths & Weaknesses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
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
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {data.strengths.length > 0 && (
              <div>
                <span className="text-green-500 font-semibold">Strengths: </span>
                <span className="text-slate-300">{data.strengths.join(", ")}</span>
              </div>
            )}
            {data.weaknesses.length > 0 && (
              <div>
                <span className="text-red-500 font-semibold">Improve: </span>
                <span className="text-slate-300">{data.weaknesses.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Percentile Bars */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-500">Percentile Rankings</h2>
          <p className="text-xs text-slate-500 mb-4">vs. all players in same grade(s)</p>
          <div className="space-y-4">
            <PercentileBar label="Scoring" value={data.percentiles.scoring} />
            <PercentileBar label="Efficiency" value={data.percentiles.efficiency} />
            <PercentileBar label="3PT Shooting" value={data.percentiles.threePoint} />
            <PercentileBar label="Experience" value={data.percentiles.experience} />
            <PercentileBar label="Discipline" value={data.percentiles.discipline} />
          </div>
        </div>
      </div>

      {/* Season Progression */}
      {data.seasonProgression.length > 1 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-500">Season Progression</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.seasonProgression}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                labelStyle={{ color: "#f59e0b" }}
              />
              <Legend />
              <Line type="monotone" dataKey="ppg" name="PPG" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="threePtPg" name="3PT/G" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="twoPtPg" name="2PT/G" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Archetype Evolution */}
      {data.archetypeHistory.length > 1 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-500">Archetype Evolution</h2>
          <div className="flex flex-wrap items-center gap-3">
            {data.archetypeHistory.map((ah, i) => {
              const style = ARCHETYPE_STYLES[ah.archetype] || { icon: "⚖️", color: "#94a3b8" };
              return (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-slate-600">→</span>}
                  <div className="text-center">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ color: style.color, backgroundColor: `${style.color}15`, border: `1px solid ${style.color}44` }}
                    >
                      {style.icon} {ah.archetype}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5 max-w-[120px] truncate">{ah.season}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
