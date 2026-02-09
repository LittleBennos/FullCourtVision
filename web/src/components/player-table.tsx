"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Filter, X } from "lucide-react";
import { FavouriteButton } from "./favourite-button";
import { SortableHeader, FilterDropdown, MinGamesFilter } from "./filters";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  total_points: number;
  ppg: number;
};

type OrgOption = { id: string; name: string };
type SeasonOption = { id: string; name: string };

type SortKey = "last_name" | "total_games" | "total_points" | "ppg";

export function PlayerTable() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial state from URL
  const initialSort = (searchParams.get("sort") as SortKey) || "total_points";
  const initialDir = (searchParams.get("dir") as "asc" | "desc") || "desc";
  const initialOrg = searchParams.get("org") || "";
  const initialSeason = searchParams.get("season") || "";
  const initialMinGames = Number(searchParams.get("minGames")) || 0;
  const initialSearch = searchParams.get("search") || "";
  const initialPage = Number(searchParams.get("page")) || 0;

  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialDir);
  const [org, setOrg] = useState(initialOrg);
  const [season, setSeason] = useState(initialSeason);
  const [minGames, setMinGames] = useState(initialMinGames);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(!!(initialOrg || initialSeason || initialMinGames));

  // Filter options
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);

  const perPage = 25;

  // Load filter options
  useEffect(() => {
    Promise.all([
      fetch("/api/organisations").then(r => r.json()),
      fetch("/api/players/filter-options").then(r => r.json()).catch(() => ({ seasons: [] })),
    ]).then(([orgData, filterData]) => {
      setOrgs((orgData.data || []).map((o: any) => ({ id: o.id, name: o.name })));
      setSeasons(filterData.seasons || []);
    });
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("search", query);
    if (org) p.set("org", org);
    if (season) p.set("season", season);
    if (minGames) p.set("minGames", String(minGames));
    if (sortKey !== "total_points") p.set("sort", sortKey);
    if (sortDir !== "desc") p.set("dir", sortDir);
    if (page > 0) p.set("page", String(page));
    const qs = p.toString();
    router.replace(`/players${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [query, org, season, minGames, sortKey, sortDir, page, router]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * perPage).toString(),
        limit: perPage.toString(),
        search: query,
        sort: sortKey,
        dir: sortDir,
      });
      if (org) params.set("org", org);
      if (season) params.set("season", season);
      if (minGames) params.set("minGames", String(minGames));
      const res = await fetch(`/api/players?${params}`);
      const data = await res.json();
      setPlayers(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (e) {
      console.error("Failed to fetch players", e);
    } finally {
      setLoading(false);
    }
  }, [page, query, sortKey, sortDir, org, season, minGames]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / perPage);

  function toggleSort(key: string) {
    const k = key as SortKey;
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir(k === "last_name" ? "asc" : "desc");
    }
    setPage(0);
  }

  const hasActiveFilters = !!(org || season || minGames);

  function clearFilters() {
    setOrg("");
    setSeason("");
    setMinGames(0);
    setPage(0);
  }

  const orgOptions = useMemo(() => orgs.map(o => ({ value: o.id, label: o.name })), [orgs]);
  const seasonOptions = useMemo(() => seasons.map(s => ({ value: s.id, label: s.name })), [seasons]);

  return (
    <div>
      {/* Search + Filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
              {[org, season, minGames].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-card border border-border rounded-lg">
          <FilterDropdown
            label="Organisation"
            value={org}
            options={orgOptions}
            onChange={(v) => { setOrg(v); setPage(0); }}
          />
          <FilterDropdown
            label="Season"
            value={season}
            options={seasonOptions}
            onChange={(v) => { setSeason(v); setPage(0); }}
          />
          <MinGamesFilter
            value={minGames}
            onChange={(v) => { setMinGames(v); setPage(0); }}
          />
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-400 transition-colors pb-2"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-2" aria-live="polite">
        {loading ? "Loading players..." : `${total.toLocaleString()} players found`}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium" scope="col">Rank</th>
              <SortableHeader label="Name" sortKey="last_name" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Games" sortKey="total_games" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader label="Points" sortKey="total_points" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader label="PPG" sortKey="ppg" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players.map((p, i) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{page * perPage + i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <FavouriteButton id={p.id} type="player" />
                    <Link href={`/players/${p.id}`} className="text-blue-400 hover:underline font-medium">
                      {p.first_name} {p.last_name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.total_games}</td>
                <td className="px-4 py-3 text-right tabular-nums">{p.total_points}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.ppg}</td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No players found{query && ` for "${searchInput}"`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages.toLocaleString()}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  );
}
