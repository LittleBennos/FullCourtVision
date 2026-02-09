"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type SeasonAgg = {
  season_id: string;
  season_name: string;
  games_played: number;
  total_points: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  ppg: number;
  fpg: number;
  twoPtPg: number;
  threePtPg: number;
  season_start: string | null;
};

interface Props {
  playerId: string;
}

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return <Minus className="w-3.5 h-3.5 text-slate-500 inline" />;
  }
  if (diff > 0) {
    return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 inline" />;
  }
  return <TrendingDown className="w-3.5 h-3.5 text-red-400 inline" />;
}

function TrendCell({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  const diff = current - previous;
  const absDiff = Math.abs(diff);
  const isUp = diff > 0;
  const isNeutral = absDiff < 0.05;

  // For fouls, going down is good
  const isPositive = invert ? !isUp : isUp;

  return (
    <div className="flex items-center justify-center gap-1">
      <span>{current.toFixed(1)}</span>
      {!isNeutral && (
        <span className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? "+" : ""}{diff.toFixed(1)}
        </span>
      )}
      {isNeutral ? (
        <Minus className="w-3 h-3 text-slate-600" />
      ) : isUp ? (
        <TrendingUp className={`w-3 h-3 ${isPositive ? "text-emerald-400" : "text-red-400"}`} />
      ) : (
        <TrendingDown className={`w-3 h-3 ${isPositive ? "text-emerald-400" : "text-red-400"}`} />
      )}
    </div>
  );
}

const METRICS = [
  { key: "ppg", label: "PPG", color: "#f59e0b" },
  { key: "fpg", label: "Fouls/Game", color: "#ef4444" },
  { key: "threePtPg", label: "3PT/Game", color: "#3b82f6" },
  { key: "twoPtPg", label: "2PT/Game", color: "#22c55e" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function MultiSeasonComparison({ playerId }: Props) {
  const [data, setData] = useState<SeasonAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(["ppg", "threePtPg", "twoPtPg", "fpg"])
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/progression`);
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      const entries: any[] = json.data || [];

      // Group by season
      const map = new Map<string, SeasonAgg>();
      for (const e of entries) {
        const key = e.season_id || e.season_name || "unknown";
        const existing = map.get(key);
        if (existing) {
          existing.games_played += e.games_played || 0;
          existing.total_points += e.total_points || 0;
          existing.two_point += (e.games_played || 0) * (e.twoPtPg || 0);
          existing.three_point += (e.games_played || 0) * (e.threePtPg || 0);
          existing.total_fouls += (e.games_played || 0) * (e.foulsPg || 0);
        } else {
          map.set(key, {
            season_id: key,
            season_name: e.season_name || "Unknown",
            games_played: e.games_played || 0,
            total_points: e.total_points || 0,
            two_point: (e.games_played || 0) * (e.twoPtPg || 0),
            three_point: (e.games_played || 0) * (e.threePtPg || 0),
            total_fouls: (e.games_played || 0) * (e.foulsPg || 0),
            ppg: 0,
            fpg: 0,
            twoPtPg: 0,
            threePtPg: 0,
            season_start: e.season_start || null,
          });
        }
      }

      // Calculate per-game averages
      const seasons = Array.from(map.values()).map((s) => {
        const gp = s.games_played || 1;
        return {
          ...s,
          two_point: Math.round(s.two_point),
          three_point: Math.round(s.three_point),
          total_fouls: Math.round(s.total_fouls),
          ppg: +(s.total_points / gp).toFixed(1),
          fpg: +(s.total_fouls / gp).toFixed(1),
          twoPtPg: +(s.two_point / gp).toFixed(1),
          threePtPg: +(s.three_point / gp).toFixed(1),
        };
      });

      seasons.sort((a, b) => {
        if (a.season_start && b.season_start) return a.season_start.localeCompare(b.season_start);
        return a.season_name.localeCompare(b.season_name);
      });

      setData(seasons);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-64 bg-slate-950 rounded-xl border border-amber-500/20 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-amber-500/50 border-t-transparent rounded-full animate-spin" />
          <p>Loading multi-season data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-950 rounded-xl border border-red-500/30 p-8 text-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-950 rounded-xl border border-amber-500/20 p-8 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-2 text-slate-200">No Season Data</h3>
        <p className="text-slate-400">No statistics available for comparison.</p>
      </div>
    );
  }

  if (data.length === 1) {
    const s = data[0];
    return (
      <div className="bg-slate-950 rounded-xl border border-amber-500/20 p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-lg font-semibold mb-2 text-amber-400">Single Season Recorded</h3>
          <p className="text-slate-400 mb-6">
            More data coming as seasons progress. Check back after the next season for comparison charts and trend analysis!
          </p>
          <div className="inline-grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-900 rounded-lg p-4 border border-amber-500/10">
              <div className="text-2xl font-bold text-amber-400">{s.ppg}</div>
              <div className="text-xs text-slate-400 mt-1">PPG</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-amber-500/10">
              <div className="text-2xl font-bold text-amber-400">{s.twoPtPg}</div>
              <div className="text-xs text-slate-400 mt-1">2PT/G</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-amber-500/10">
              <div className="text-2xl font-bold text-amber-400">{s.threePtPg}</div>
              <div className="text-xs text-slate-400 mt-1">3PT/G</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-amber-500/10">
              <div className="text-2xl font-bold text-amber-400">{s.fpg}</div>
              <div className="text-xs text-slate-400 mt-1">FPG</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            {s.season_name} • {s.games_played} games • {s.total_points} points
          </p>
        </div>
      </div>
    );
  }

  // Multi-season view
  const chartData = data.map((s) => ({
    name: s.season_name,
    ppg: s.ppg,
    fpg: s.fpg,
    twoPtPg: s.twoPtPg,
    threePtPg: s.threePtPg,
  }));

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="bg-slate-950 rounded-xl border border-amber-500/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-100">Season-over-Season Trends</h3>
            <p className="text-sm text-slate-400 mt-1">
              Per-game averages aggregated by season across {data.length} seasons
            </p>
          </div>
        </div>

        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2 mb-6">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                activeMetrics.has(m.key)
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                  : "border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: m.color, opacity: activeMetrics.has(m.key) ? 1 : 0.3 }}
              />
              {m.label}
            </button>
          ))}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                axisLine={{ stroke: "#334155" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #f59e0b33",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#fbbf24", fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="line"
              />
              {METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={{ fill: m.color, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                  name={m.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Season comparison table */}
      <div className="bg-slate-950 rounded-xl border border-amber-500/20 p-6">
        <h3 className="text-xl font-bold text-slate-100 mb-4">Season-by-Season Stats</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-500/20">
                <th className="text-left py-3 px-3 text-amber-400 font-semibold">Season</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">GP</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">PTS</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">2PT</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">3PT</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">F</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">PPG</th>
                <th className="text-center py-3 px-3 text-amber-400 font-semibold">FPG</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => {
                const prev = i > 0 ? data[i - 1] : null;
                return (
                  <tr key={s.season_id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">{s.season_name}</td>
                    <td className="text-center py-3 px-3 text-slate-300">{s.games_played}</td>
                    <td className="text-center py-3 px-3 text-slate-300">{s.total_points}</td>
                    <td className="text-center py-3 px-3 text-slate-300">{s.two_point}</td>
                    <td className="text-center py-3 px-3 text-slate-300">{s.three_point}</td>
                    <td className="text-center py-3 px-3 text-slate-300">{s.total_fouls}</td>
                    <td className="text-center py-3 px-3">
                      {prev ? (
                        <TrendCell current={s.ppg} previous={prev.ppg} />
                      ) : (
                        <span className="text-slate-300">{s.ppg.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-3">
                      {prev ? (
                        <TrendCell current={s.fpg} previous={prev.fpg} invert />
                      ) : (
                        <span className="text-slate-300">{s.fpg.toFixed(1)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overall trend summary */}
        {data.length >= 2 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {(() => {
              const first = data[0];
              const last = data[data.length - 1];
              const ppgDiff = last.ppg - first.ppg;
              const fpgDiff = last.fpg - first.fpg;
              return (
                <>
                  <div className={`text-xs px-3 py-1.5 rounded-full border ${
                    ppgDiff > 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : ppgDiff < 0
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-slate-600 bg-slate-800 text-slate-400"
                  }`}>
                    PPG: {ppgDiff > 0 ? "+" : ""}{ppgDiff.toFixed(1)} overall
                    {ppgDiff > 0 ? " 📈" : ppgDiff < 0 ? " 📉" : " ➡️"}
                  </div>
                  <div className={`text-xs px-3 py-1.5 rounded-full border ${
                    fpgDiff < 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : fpgDiff > 0
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-slate-600 bg-slate-800 text-slate-400"
                  }`}>
                    FPG: {fpgDiff > 0 ? "+" : ""}{fpgDiff.toFixed(1)} overall
                    {fpgDiff < 0 ? " 📈" : fpgDiff > 0 ? " 📉" : " ➡️"}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
