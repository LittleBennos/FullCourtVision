"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, Legend
} from "recharts";
import { useState, useEffect, useCallback } from "react";

type ProgressionEntry = {
  id: string;
  grade_name: string;
  season_name: string;
  competition_name: string;
  team_name: string;
  games_played: number;
  total_points: number;
  ppg: number;
  twoPtPg: number;
  threePtPg: number;
  foulsPg: number;
  movingAvg: number;
  isPeak: boolean;
  isValley: boolean;
};

type SeasonOption = { id: string; name: string };

interface SeasonProgressionChartProps {
  playerId: string;
}

// Custom dot renderer for peak/valley annotations
function AnnotatedDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return null;

  if (payload.isPeak) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy - 14} textAnchor="middle" fill="#22c55e" fontSize={11} fontWeight={700}>
          ▲ Peak
        </text>
      </g>
    );
  }
  if (payload.isValley) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy + 22} textAnchor="middle" fill="#ef4444" fontSize={11} fontWeight={700}>
          ▼ Valley
        </text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="#60a5fa" stroke="#1e293b" strokeWidth={2} />;
}

export function SeasonProgressionChart({ playerId }: SeasonProgressionChartProps) {
  const [data, setData] = useState<ProgressionEntry[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (seasonId: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = seasonId === "all"
        ? `/api/players/${playerId}/progression`
        : `/api/players/${playerId}/progression?season=${seasonId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch progression data");
      const json = await res.json();
      setData(json.data || []);
      if (seasonId === "all") {
        setSeasons(json.seasons || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchData("all");
  }, [fetchData]);

  const handleSeasonChange = (val: string) => {
    setSelectedSeason(val);
    fetchData(val);
  };

  if (loading) {
    return (
      <div className="h-80 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <p>Loading season progression...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-8 text-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-8 text-center">
        <div className="text-5xl mb-4">📈</div>
        <h3 className="text-lg font-semibold mb-2 text-slate-200">Not Enough Data</h3>
        <p className="text-slate-400">
          Season progression requires at least 2 competition entries.
        </p>
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    ...d,
    label: d.grade_name
      ? `${d.season_name} (${d.grade_name})`
      : d.season_name || `Entry ${i + 1}`,
  }));

  const peak = data.find(d => d.isPeak);
  const valley = data.find(d => d.isValley);

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-6">
      {/* Header + Season Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Season Progression</h3>
          <p className="text-sm text-slate-400 mt-1">
            Points per game across competition entries with trend line
          </p>
        </div>
        {seasons.length > 1 && (
          <select
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            <option value="all">All Seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Annotations summary */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-4 text-sm">
        {peak && (
          <div className="flex items-center gap-2 bg-green-950/50 border border-green-800/50 rounded-lg px-3 py-1.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <span className="text-green-400 shrink-0">Peak: {peak.ppg} PPG</span>
            <span className="text-slate-500 truncate">— {peak.competition_name} {peak.season_name}</span>
          </div>
        )}
        {valley && (
          <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-1.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <span className="text-red-400 shrink-0">Valley: {valley.ppg} PPG</span>
            <span className="text-slate-500 truncate">— {valley.competition_name} {valley.season_name}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-80 w-full" role="img" aria-label={`Season progression chart showing points per game across ${chartData.length} competition entries with trend line`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              domain={["dataMin - 1", "dataMax + 1"]}
              label={{ value: "PPG", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
              formatter={(value: number | undefined, name: string | undefined) => [
                value != null ? value.toFixed(1) : "0",
                name === "ppg" ? "PPG" : name === "movingAvg" ? "Trend (3-entry MA)" : (name || ""),
              ]}
              labelFormatter={(_: any, payload: readonly any[]) => {
                const d = payload?.[0]?.payload;
                if (!d) return "";
                return `${d.competition_name} — ${d.season_name}${d.grade_name ? ` (${d.grade_name})` : ""}\n${d.team_name} • ${d.games_played} games`;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value: string) =>
                value === "ppg" ? "PPG" : value === "movingAvg" ? "Trend (Moving Avg)" : value
              }
            />
            <Line
              type="monotone"
              dataKey="ppg"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={<AnnotatedDot />}
              activeDot={{ r: 6, stroke: "#60a5fa", strokeWidth: 2 }}
              name="ppg"
            />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="movingAvg"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-slate-500 space-y-1">
        <p>
          Showing {data.length} competition entries •{" "}
          {data.reduce((s, d) => s + d.games_played, 0)} total games •{" "}
          Trend line: 3-entry moving average
        </p>
      </div>
    </div>
  );
}
