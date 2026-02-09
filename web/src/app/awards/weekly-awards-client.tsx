"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy, Target, Crosshair, Crown, TrendingUp, Loader2, ChevronDown, Flame,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface AwardEntry {
  player_id: string;
  player_name: string;
  team_name: string;
  points: number;
  two_point: number;
  three_point: number;
  games_played: number;
  mvp_score: number;
}

interface RoundAward {
  round_name: string;
  round_number: number | null;
  top_scorer: AwardEntry | null;
  sharpshooter: AwardEntry | null;
  paint_beast: AwardEntry | null;
  mvp: AwardEntry | null;
  top5_scorers: AwardEntry[];
  top5_shooters: AwardEntry[];
  top5_paint: AwardEntry[];
  top5_mvp: AwardEntry[];
}

interface MostImproved {
  player_id: string;
  player_name: string;
  team_name: string;
  early_ppg: number;
  late_ppg: number;
  improvement: number;
}

interface WeeklyAwardsData {
  rounds: RoundAward[];
  most_improved: MostImproved | null;
}

type Category = "top_scorer" | "sharpshooter" | "paint_beast" | "mvp";

const categories: { key: Category; label: string; icon: typeof Trophy; color: string; dataKey: string; valueLabel: string }[] = [
  { key: "top_scorer", label: "Top Scorer", icon: Target, color: "#f59e0b", dataKey: "points", valueLabel: "Points" },
  { key: "sharpshooter", label: "Sharpshooter", icon: Crosshair, color: "#3b82f6", dataKey: "three_point", valueLabel: "3PT Made" },
  { key: "paint_beast", label: "Paint Beast", icon: Flame, color: "#ef4444", dataKey: "two_point", valueLabel: "2PT Made" },
  { key: "mvp", label: "MVP", icon: Crown, color: "#a855f7", dataKey: "mvp_score", valueLabel: "MVP Score" },
];

const CHART_COLORS = ["#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];

function CategoryChart({ entries, dataKey, valueLabel, color }: {
  entries: AwardEntry[];
  dataKey: string;
  valueLabel: string;
  color: string;
}) {
  if (entries.length === 0) return <p className="text-muted-foreground text-sm italic py-4">No data available</p>;

  const chartData = entries.map((e) => ({
    name: e.player_name.length > 15 ? e.player_name.slice(0, 14) + "…" : e.player_name,
    fullName: e.player_name,
    value: (e as any)[dataKey] || 0,
    player_id: e.player_id,
    team_name: e.team_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "#d1d5db", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            color: "#f9fafb",
          }}
          formatter={(value: number | undefined) => [value ?? 0, valueLabel]}
          labelFormatter={(label: any, payload: any) => {
            if (payload?.[0]?.payload?.fullName) return payload[0].payload.fullName;
            return label;
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i] || color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WinnerCard({ entry, category }: {
  entry: AwardEntry | null;
  category: typeof categories[0];
}) {
  const Icon = category.icon;
  if (!entry) return null;

  const statValue =
    category.key === "mvp"
      ? entry.mvp_score.toFixed(1)
      : (entry as any)[category.dataKey];

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: category.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={`/players/${entry.player_id}`}
          className="text-sm font-bold text-foreground hover:text-accent transition-colors truncate block"
        >
          {entry.player_name}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{entry.team_name}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-lg font-bold" style={{ color: category.color }}>
          {statValue}
        </span>
        <p className="text-[10px] text-muted-foreground">{category.valueLabel}</p>
      </div>
    </div>
  );
}

export function WeeklyAwardsClient({ seasons }: { seasons: { id: string; name: string }[] }) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.name || "");
  const [data, setData] = useState<WeeklyAwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category>("top_scorer");

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true);
    fetch(`/api/awards/weekly?season=${encodeURIComponent(selectedSeason)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setSelectedRound(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSeason]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!data || data.rounds.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">No weekly award data available for this season.</p>
    );
  }

  const currentRound = data.rounds[selectedRound];
  const cat = categories.find((c) => c.key === selectedCategory)!;

  const top5Map: Record<Category, AwardEntry[]> = {
    top_scorer: currentRound.top5_scorers,
    sharpshooter: currentRound.top5_shooters,
    paint_beast: currentRound.top5_paint,
    mvp: currentRound.top5_mvp,
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {seasons.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(Number(e.target.value))}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {data.rounds.map((r, i) => (
            <option key={i} value={i}>
              {r.round_name}
            </option>
          ))}
        </select>
      </div>

      {/* Award Winners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((c) => (
          <WinnerCard key={c.key} entry={currentRound[c.key]} category={c} />
        ))}
      </div>

      {/* Most Improved Banner */}
      {data.most_improved && selectedRound === 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider">Most Improved</h3>
              <Link
                href={`/players/${data.most_improved.player_id}`}
                className="text-lg font-bold text-foreground hover:text-accent transition-colors"
              >
                {data.most_improved.player_name}
              </Link>
              <p className="text-sm text-muted-foreground">{data.most_improved.team_name}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-green-400">
                +{data.most_improved.improvement}
              </span>
              <p className="text-xs text-muted-foreground">
                PPG ({data.most_improved.early_ppg} → {data.most_improved.late_ppg})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs + Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === c.key
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>

        <h3 className="text-lg font-semibold mb-3">
          Top 5 — {cat.label} ({currentRound.round_name})
        </h3>

        <CategoryChart
          entries={top5Map[selectedCategory]}
          dataKey={cat.dataKey}
          valueLabel={cat.valueLabel}
          color={cat.color}
        />

        {/* Linked player list under chart */}
        <div className="mt-4 space-y-2">
          {top5Map[selectedCategory].map((entry, i) => (
            <div key={entry.player_id} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <Link
                href={`/players/${entry.player_id}`}
                className="font-medium text-foreground hover:text-accent transition-colors flex-1 truncate"
              >
                {entry.player_name}
              </Link>
              <span className="text-muted-foreground truncate max-w-[120px]">{entry.team_name}</span>
              <span className="font-bold" style={{ color: cat.color }}>
                {cat.key === "mvp" ? entry.mvp_score.toFixed(1) : (entry as any)[cat.dataKey]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
