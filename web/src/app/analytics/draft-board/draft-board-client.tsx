"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy,
  ArrowUpDown,
  Search,
  Printer,
  Crown,
  Star,
  Shield,
  Users,
  ChevronDown,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────────── */

interface DraftPlayer {
  rank: number;
  id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  grade_name: string;
  grade_id: string;
  composite: number;
  per: number;
  ppg: number;
  games: number;
  tier: string;
}

interface DraftData {
  data: DraftPlayer[];
  meta: { total: number; season: string; grade: string };
}

interface Season {
  id: string;
  name: string;
  competition_name: string;
}

/* ── helpers ───────────────────────────────────────────────── */

const tierConfig: Record<string, { color: string; bg: string; icon: typeof Crown }> = {
  Elite: { color: "text-amber-400", bg: "bg-amber-400/15 border-amber-400/30", icon: Crown },
  Star: { color: "text-purple-400", bg: "bg-purple-400/15 border-purple-400/30", icon: Star },
  Starter: { color: "text-blue-400", bg: "bg-blue-400/15 border-blue-400/30", icon: Shield },
  Rotation: { color: "text-green-400", bg: "bg-green-400/15 border-green-400/30", icon: Users },
  Bench: { color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20", icon: ChevronDown },
};

function TierBadge({ tier }: { tier: string }) {
  const cfg = tierConfig[tier] || tierConfig.Bench;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {tier}
    </span>
  );
}

type SortField = "rank" | "composite" | "per" | "ppg" | "games";

/* ── component ─────────────────────────────────────────────── */

export function DraftBoardClient({
  initialData,
  seasons,
  selectedSeason,
}: {
  initialData: DraftData;
  seasons: Season[];
  selectedSeason?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DraftData>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState(searchParams.get("grade") || "");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  // Unique grades from data
  const grades = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data.data) {
      if (p.grade_id && p.grade_name) map.set(p.grade_id, p.grade_name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Refetch on season/grade change
  useEffect(() => {
    const season = searchParams.get("season") || "";
    const grade = searchParams.get("grade") || "";
    setGradeFilter(grade);

    const url = new URL("/api/analytics/draft-board", window.location.origin);
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

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = data.data || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.team_name.toLowerCase().includes(q)
      );
    }
    if (gradeFilter) {
      list = list.filter((p) => p.grade_id === gradeFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return sorted;
  }, [data, search, gradeFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === "rank");
    }
  };

  const handleSeasonChange = (val: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set("season", val);
    else p.delete("season");
    router.push(`/analytics/draft-board?${p.toString()}`);
  };

  const handleGradeChange = (val: string) => {
    setGradeFilter(val);
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set("grade", val);
    else p.delete("grade");
    router.push(`/analytics/draft-board?${p.toString()}`);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-amber-400 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <ArrowUpDown className="w-3 h-3 text-amber-400" />
        )}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              Draft Board
            </h1>
            <p className="text-muted-foreground mt-1">
              Prospect rankings based on composite scoring — PER, scoring trends, consistency &amp; availability.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30 hover:bg-amber-400/25 transition-colors text-sm font-medium print:hidden"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search players or teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
          <select
            value={searchParams.get("season") || ""}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="">All Seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.competition_name ? `${s.competition_name} — ${s.name}` : s.name}
              </option>
            ))}
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} of {data.meta.total} players
          </span>
        </div>

        {/* Tier Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 print:mb-2">
          {Object.entries(tierConfig).map(([tier]) => (
            <TierBadge key={tier} tier={tier} />
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {loading && (
            <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <SortHeader field="rank">Rank</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Player</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Team</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Grade</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tier</th>
                <SortHeader field="composite">Score</SortHeader>
                <SortHeader field="ppg">PPG</SortHeader>
                <SortHeader field="per">PER</SortHeader>
                <SortHeader field="games">GP</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No players found.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const cfg = tierConfig[p.tier] || tierConfig.Bench;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {p.rank}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/players/${p.id}`}
                        className="hover:text-amber-400 transition-colors"
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {p.team_name}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                      {p.grade_name}
                    </td>
                    <td className="px-3 py-2.5">
                      <TierBadge tier={p.tier} />
                    </td>
                    <td className={`px-3 py-2.5 font-bold ${cfg.color}`}>
                      {p.composite}
                    </td>
                    <td className="px-3 py-2.5">{p.ppg}</td>
                    <td className="px-3 py-2.5">{p.per}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.games}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-4 text-xs text-muted-foreground text-center">
          Generated by FullCourtVision — {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:mb-2 { margin-bottom: 0.5rem !important; }
          table { font-size: 10px !important; }
          th, td { padding: 4px 6px !important; }
          a { color: inherit !important; text-decoration: none !important; }
          .bg-card, .bg-muted\\/30, .bg-muted\\/20 { background: transparent !important; }
          .border-border { border-color: #ccc !important; }
        }
      `}</style>
    </div>
  );
}
