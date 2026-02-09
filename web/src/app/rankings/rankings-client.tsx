"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus, Loader2, ChevronUp, ChevronDown } from "lucide-react";

interface Breakdown {
  win_pct: number;
  point_diff: number;
  top5_scoring: number;
  bench_depth: number;
}

interface RankedTeam {
  rank: number;
  team_id: string;
  name: string;
  organisation_name: string;
  season_id: string;
  season_name: string;
  wins: number;
  losses: number;
  gp: number;
  power_rating: number;
  breakdown: Breakdown;
  avg_point_diff: number;
  roster_size: number;
}

interface Season {
  id: string;
  name: string;
}

type SortField = "rank" | "power_rating" | "wins" | "losses" | "avg_point_diff";

export function RankingsClient() {
  const [teams, setTeams] = useState<RankedTeam[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const seasonId = searchParams.get("season") || "";

  useEffect(() => {
    setLoading(true);
    const url = seasonId
      ? `/api/rankings/power?season=${seasonId}`
      : "/api/rankings/power";
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        setTeams(res.data || []);
        setSeasons(res.seasons || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [seasonId]);

  const handleSeasonChange = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.delete("season");
    else params.set("season", val);
    router.push(`/rankings${params.toString() ? `?${params}` : ""}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(field === "rank"); }
  };

  const sorted = useMemo(() => {
    const copy = [...teams];
    copy.sort((a, b) => {
      const av = a[sortField] as number;
      const bv = b[sortField] as number;
      return sortAsc ? av - bv : bv - av;
    });
    return copy;
  }, [teams, sortField, sortAsc]);

  const top20 = useMemo(
    () => teams.slice(0, 20).map((t) => ({ name: t.name.length > 20 ? t.name.slice(0, 18) + "…" : t.name, rating: t.power_rating, fullName: t.name })),
    [teams]
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="ml-3 text-muted-foreground">Computing power rankings…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Power Rankings</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Composite team ratings based on win rate (40%), point differential (25%), top-5 player scoring (20%), and bench depth (15%).
      </p>

      {/* Season Filter */}
      <div className="mb-6">
        <label htmlFor="season-select" className="block text-sm font-medium text-foreground mb-2">
          Filter by Season
        </label>
        <select
          id="season-select"
          value={seasonId || "all"}
          onChange={(e) => handleSeasonChange(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent min-w-[200px]"
        >
          <option value="all">All Seasons</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Top 20 Chart */}
      {top20.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Top 20 Teams</h2>
          <div style={{ height: Math.max(400, top20.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" opacity={0.4} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.6}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}`, "Power Rating"]}
                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar dataKey="rating" radius={[0, 6, 6, 0]}>
                  {top20.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#f59e0b" : i < 3 ? "#d97706" : i < 10 ? "#b45309" : "#78716c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold cursor-pointer hover:text-accent" onClick={() => handleSort("rank")}>
                  #<SortIcon field="rank" />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:text-accent" onClick={() => handleSort("wins")}>
                  W<SortIcon field="wins" />
                </th>
                <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:text-accent" onClick={() => handleSort("losses")}>
                  L<SortIcon field="losses" />
                </th>
                <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:text-accent" onClick={() => handleSort("avg_point_diff")}>
                  +/-<SortIcon field="avg_point_diff" />
                </th>
                <th className="px-4 py-3 text-right font-semibold cursor-pointer hover:text-accent" onClick={() => handleSort("power_rating")}>
                  Rating<SortIcon field="power_rating" />
                </th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell" style={{ minWidth: 200 }}>
                  Breakdown
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.team_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-muted-foreground">
                    {t.rank <= 3 ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        t.rank === 1 ? "bg-yellow-500/20 text-yellow-500" :
                        t.rank === 2 ? "bg-gray-300/20 text-gray-400" :
                        "bg-amber-700/20 text-amber-600"
                      }`}>{t.rank}</span>
                    ) : t.rank}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/teams/${t.team_id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                      {t.name}
                    </Link>
                    {t.organisation_name && (
                      <div className="text-xs text-muted-foreground mt-0.5">{t.organisation_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-green-500 font-medium">{t.wins}</td>
                  <td className="px-4 py-3 text-center text-red-400 font-medium">{t.losses}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${t.avg_point_diff > 0 ? "text-green-500" : t.avg_point_diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {t.avg_point_diff > 0 ? "+" : ""}{t.avg_point_diff}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-lg text-accent">{t.power_rating.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <BreakdownBars breakdown={t.breakdown} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {teams.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No teams found.</div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Showing {teams.length} teams with 3+ games played. Ratings are relative within the filtered set.
      </p>
    </div>
  );
}

function BreakdownBars({ breakdown }: { breakdown: Breakdown }) {
  const items = [
    { label: "Win%", value: breakdown.win_pct, color: "bg-green-500" },
    { label: "+/-", value: breakdown.point_diff, color: "bg-blue-500" },
    { label: "Top 5", value: breakdown.top5_scoring, color: "bg-amber-500" },
    { label: "Bench", value: breakdown.bench_depth, color: "bg-purple-500" },
  ];

  return (
    <div className="flex gap-1 items-end">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5" title={`${item.label}: ${item.value.toFixed(1)}`}>
          <div className="w-8 bg-muted rounded-sm overflow-hidden" style={{ height: 28 }}>
            <div
              className={`${item.color} rounded-sm transition-all`}
              style={{ height: `${item.value}%`, marginTop: `${100 - item.value}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
