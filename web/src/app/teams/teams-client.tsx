"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import type { Team } from "@/lib/data";
import { FavouriteButton } from "@/components/favourite-button";
import { SortableHeader, FilterDropdown } from "@/components/filters";

type SortKey = "name" | "org_name" | "wins" | "losses" | "games_played" | "win_pct";

function getWinPct(t: Team) {
  return t.games_played > 0 ? t.wins / t.games_played : 0;
}

export function TeamsClient({ teams: teamsData }: { teams: Team[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSort = (searchParams.get("sort") as SortKey) || "name";
  const initialDir = (searchParams.get("dir") as "asc" | "desc") || "asc";
  const initialOrg = searchParams.get("org") || "";
  const initialSeason = searchParams.get("season") || "";

  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialDir);
  const [org, setOrg] = useState(initialOrg);
  const [season, setSeason] = useState(initialSeason);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(!!(initialOrg || initialSeason));
  const perPage = 25;

  // Extract unique orgs and seasons from data
  const orgOptions = useMemo(() => {
    const map = new Map<string, string>();
    teamsData.forEach(t => { if (t.organisation_id && t.org_name) map.set(t.organisation_id, t.org_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [teamsData]);

  const seasonOptions = useMemo(() => {
    const map = new Map<string, string>();
    teamsData.forEach(t => { if (t.season_id && t.season_name) map.set(t.season_id, t.season_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [teamsData]);

  // Update URL
  const updateUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const vals: Record<string, string> = { search: query, org, season, sort: sortKey, dir: sortDir, ...overrides };
    if (vals.search) p.set("search", vals.search);
    if (vals.org) p.set("org", vals.org);
    if (vals.season) p.set("season", vals.season);
    if (vals.sort !== "name") p.set("sort", vals.sort);
    if (vals.dir !== "asc") p.set("dir", vals.dir);
    const qs = p.toString();
    router.replace(`/teams${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = teamsData.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.org_name?.toLowerCase().includes(q)
    );
    if (org) result = result.filter(t => t.organisation_id === org);
    if (season) result = result.filter(t => t.season_id === season);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "org_name": cmp = (a.org_name || "").localeCompare(b.org_name || ""); break;
        case "wins": cmp = a.wins - b.wins; break;
        case "losses": cmp = a.losses - b.losses; break;
        case "games_played": cmp = a.games_played - b.games_played; break;
        case "win_pct": cmp = getWinPct(a) - getWinPct(b); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [query, teamsData, org, season, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const hasActiveFilters = !!(org || season);

  function toggleSort(key: string) {
    const k = key as SortKey;
    let newDir: "asc" | "desc";
    if (sortKey === k) {
      newDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      newDir = (k === "name" || k === "org_name") ? "asc" : "desc";
    }
    setSortKey(k);
    setSortDir(newDir);
    setPage(0);
    updateUrl({ sort: k, dir: newDir });
  }

  function clearFilters() {
    setOrg(""); setSeason(""); setPage(0);
    updateUrl({ org: "", season: "" });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Team Directory</h1>
      <p className="text-muted-foreground mb-6">{teamsData.length.toLocaleString()} teams</p>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search teams..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            aria-label="Search teams"
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-blue-400/10 border-blue-400/50 text-blue-400"
              : "bg-card border-border hover:bg-muted"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold">
              {[org, season].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-card border border-border rounded-lg">
          <FilterDropdown label="Organisation" value={org} options={orgOptions}
            onChange={(v) => { setOrg(v); setPage(0); updateUrl({ org: v }); }} />
          <FilterDropdown label="Season" value={season} options={seasonOptions}
            onChange={(v) => { setSeason(v); setPage(0); updateUrl({ season: v }); }} />
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-400 transition-colors pb-2">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-2">
        {filtered.length.toLocaleString()} teams{hasActiveFilters ? " (filtered)" : ""}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border" role="region" aria-label="Teams table">
        <table className="w-full text-sm" aria-label="Team directory">
          <thead className="bg-muted/50">
            <tr>
              <SortableHeader label="Team" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Organisation" sortKey="org_name" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <th scope="col" className="text-left px-4 py-3 font-medium">Season</th>
              <SortableHeader label="W" sortKey="wins" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader label="L" sortKey="losses" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader label="GP" sortKey="games_played" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader label="Win%" sortKey="win_pct" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <FavouriteButton id={t.id} type="team" />
                    <Link href={`/teams/${t.id}`} className="text-blue-400 hover:underline font-medium">
                      {t.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.org_name || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.season_name || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-green-400">{t.wins}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">{t.losses}</td>
                <td className="px-4 py-3 text-right tabular-nums">{t.games_played}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {t.games_played > 0 ? `${(getWinPct(t) * 100).toFixed(0)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            aria-label="Previous page"
            className="px-3 py-2 min-h-[44px] text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground" aria-live="polite">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
            aria-label="Next page"
            className="px-3 py-2 min-h-[44px] text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  );
}
