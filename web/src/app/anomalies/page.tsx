"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { Anomaly, AnomalyType } from "@/lib/anomalies";

interface LeaderboardEntry {
  player_id: string;
  first_name: string;
  last_name: string;
  anomalies: Anomaly[];
}

const ANOMALY_TYPES: { value: AnomalyType | "all"; label: string; emoji: string }[] = [
  { value: "all", label: "All Types", emoji: "🏀" },
  { value: "ironman", label: "Ironman", emoji: "🛡️" },
  { value: "scoring_spike", label: "Scoring Spike", emoji: "🔥" },
  { value: "three_point_specialist", label: "Sniper", emoji: "🎯" },
  { value: "volume_scorer", label: "Volume Scorer", emoji: "💪" },
  { value: "foul_trouble", label: "Foul Trouble", emoji: "⚠️" },
  { value: "defensive_discipline", label: "Disciplined", emoji: "🧘" },
  { value: "rising_star", label: "Top Ranked", emoji: "⭐" },
  { value: "consistent_performer", label: "Consistent", emoji: "📊" },
  { value: "sharpshooter", label: "Sharpshooter", emoji: "🏹" },
];

const severityColors = {
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  rare: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  notable: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const severityLabels = {
  legendary: "Legendary",
  rare: "Rare",
  notable: "Notable",
};

export default function AnomaliesPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<AnomalyType | "all">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100", min_games: "10" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    try {
      const res = await fetch(`/api/anomalies/leaderboard?${params}`);
      const data = await res.json();
      setEntries(data.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Anomalies" }]} />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Statistical Anomalies</h1>
        <p className="text-muted-foreground">
          Unusual stat patterns detected across all players. These badges highlight
          remarkable achievements, streaks, and outlier performances.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ANOMALY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typeFilter === t.value
                ? "bg-white text-black border-white"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No anomalies found for this filter.</p>
          <p className="text-sm mt-1">Try a different type or lower the minimum games threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link
              key={entry.player_id}
              href={`/players/${entry.player_id}`}
              className="block p-4 rounded-xl bg-card border border-border hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {entry.first_name} {entry.last_name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.anomalies.map((a, i) => (
                    <span
                      key={`${a.type}-${i}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${severityColors[a.severity]}`}
                      title={a.detail}
                    >
                      <span>{a.emoji}</span>
                      <span>{a.label}</span>
                      <span className="opacity-60">({severityLabels[a.severity]})</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {entry.anomalies.map((a) => a.detail).join(" · ")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
