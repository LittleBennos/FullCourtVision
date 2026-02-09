"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, ArrowUpDown, Search } from "lucide-react";

interface PERPlayer {
  rank: number;
  id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  grade_name: string;
  grade_id: string;
  per: number;
  games: number;
  ppg: number;
  percentile: number;
}

interface PERData {
  data: PERPlayer[];
  meta: {
    total: number;
    season: string;
    grade: string;
    league_avg_per: number;
  };
}

interface Season {
  id: string;
  name: string;
  competition_name: string;
}

function perColor(per: number): string {
  if (per >= 25) return "text-amber-400";
  if (per >= 20) return "text-green-400";
  if (per >= 15) return "text-blue-400";
  if (per >= 10) return "text-slate-300";
  return "text-slate-500";
}

function perLabel(per: number): string {
  if (per >= 30) return "MVP";
  if (per >= 25) return "Elite";
  if (per >= 20) return "All-Star";
  if (per >= 15) return "Above Avg";
  if (per >= 10) return "Average";
  if (per >= 5) return "Below Avg";
  return "Developing";
}

export function PERClient({
  initialData,
  seasons,
  selectedSeason,
}: {
  initialData: PERData;
  seasons: Season[];
  selectedSeason?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PERData>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState(searchParams.get("grade") || "");
  const [sortField, setSortField] = useState<"per" | "games" | "ppg">("per");
  const [sortAsc, setSortAsc] = useState(false);

  // Extract unique grades from data
  const grades = useMemo(() => {
    const gradeMap = new Map<string, string>();
    for (const p of data.data) {
      if (p.grade_id && p.grade_name) {
        gradeMap.set(p.grade_id, p.grade_name);
      }
    }
    return Array.from(gradeMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Fetch new data when season changes
  useEffect(() => {
    const season = searchParams.get("season") || "";
    const grade = searchParams.get("grade") || "";
    setGradeFilter(grade);

    const url = new URL("/api/analytics/per", window.location.origin);
    if (season) url.searchParams.set("season", season);
    if (grade) url.searchParams.set("grade", grade);
    url.searchParams.set("limit", "500");

    setLoading(true);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  const filtered = useMemo(() => {
    let rows = data.data || [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.team_name?.toLowerCase().includes(q)
      );
    }
    if (gradeFilter) {
      rows = rows.filter((p) => p.grade_id === gradeFilter);
    }
    rows = [...rows].sort((a, b) =>
      sortAsc ? a[sortField] - b[sortField] : b[sortField] - a[sortField]
    );
    return rows.slice(0, 100);
  }, [data, search, gradeFilter, sortField, sortAsc]);

  function handleSort(field: "per" | "games" | "ppg") {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function updateFilters(season: string, grade: string) {
    const params = new URLSearchParams();
    if (season) params.set("season", season);
    if (grade) params.set("grade", grade);
    router.push(`/analytics/per${params.toString() ? `?${params}` : ""}`);
  }

  const currentSeason = searchParams.get("season") || "";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold">Player Efficiency Ratings</h1>
        </div>
        <p className="text-muted-foreground">
          PER measures overall player efficiency, normalized so league average = 15.
          Based on points, field goals, and discipline.
        </p>
      </div>

      {/* PER Scale Legend */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">PER Scale</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-amber-400 font-medium">30+ MVP</span>
          <span className="text-amber-400">25+ Elite</span>
          <span className="text-green-400">20+ All-Star</span>
          <span className="text-blue-400">15+ Above Avg</span>
          <span className="text-slate-300">10+ Average</span>
          <span className="text-slate-500">&lt;10 Below Avg</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={currentSeason}
          onChange={(e) => updateFilters(e.target.value, gradeFilter)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Seasons</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.competition_name}
            </option>
          ))}
        </select>

        <select
          value={gradeFilter}
          onChange={(e) => updateFilters(currentSeason, e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players or teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading ? "Loading..." : `${filtered.length} of ${data.meta?.total || 0} eligible players`}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Player Efficiency Rating leaderboard">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-sm font-semibold" scope="col">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" scope="col">Player</th>
                <th className="text-left py-3 px-4 text-sm font-semibold hidden sm:table-cell" scope="col">Team</th>
                <th className="text-left py-3 px-4 text-sm font-semibold hidden md:table-cell" scope="col">Grade</th>
                <th
                  className="text-center py-3 px-4 text-sm font-semibold cursor-pointer select-none"
                  scope="col"
                  onClick={() => handleSort("per")}
                >
                  <span className="inline-flex items-center gap-1">
                    PER <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="text-center py-3 px-4 text-sm font-semibold cursor-pointer select-none"
                  scope="col"
                  onClick={() => handleSort("games")}
                >
                  <span className="inline-flex items-center gap-1">
                    GP <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="text-center py-3 px-4 text-sm font-semibold cursor-pointer select-none"
                  scope="col"
                  onClick={() => handleSort("ppg")}
                >
                  <span className="inline-flex items-center gap-1">
                    PPG <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold hidden lg:table-cell" scope="col">
                  Percentile
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold hidden md:table-cell" scope="col">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-muted-foreground">{p.rank}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/players/${p.id}`}
                      className="text-sm font-medium hover:text-amber-500 transition-colors"
                    >
                      {p.first_name} {p.last_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">
                    {p.team_name || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[150px]">
                    {p.grade_name || "-"}
                  </td>
                  <td className={`text-center py-3 px-4 text-sm font-bold ${perColor(p.per)}`}>
                    {p.per}
                  </td>
                  <td className="text-center py-3 px-4 text-sm">{p.games}</td>
                  <td className="text-center py-3 px-4 text-sm">{p.ppg}</td>
                  <td className="text-center py-3 px-4 text-sm hidden lg:table-cell">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                      {p.percentile}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-sm hidden md:table-cell">
                    <span className={`text-xs font-medium ${perColor(p.per)}`}>
                      {perLabel(p.per)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    {loading ? "Calculating efficiency ratings..." : "No players found matching your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
