"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from "lucide-react";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  total_points: number;
  ppg: number;
};

type SortKey = "last_name" | "total_games" | "total_points" | "ppg";

export function PlayerTable({ initialPlayers, initialTotal }: { initialPlayers?: Player[]; initialTotal?: number }) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(!initialPlayers);
  const perPage = 25;

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * perPage).toString(),
        limit: perPage.toString(),
        search: query,
      });
      const res = await fetch(`/api/players?${params}`);
      const data = await res.json();
      setPlayers(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (e) {
      console.error("Failed to fetch players", e);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...players];
    sorted.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return sorted;
  }, [players, sortKey, sortDir]);

  const totalPages = Math.ceil(total / perPage);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "last_name" ? "asc" : "desc");
    }
    setPage(0);
  }

  function handleSortKeyDown(e: React.KeyboardEvent, key: SortKey) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSort(key);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) {
      return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortDir === "asc" 
      ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
      : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />;
  }

  return (
    <div>
      <div className="relative mb-4">
        <label htmlFor="player-search" className="sr-only">
          Search players by name
        </label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <input
          id="player-search"
          type="text"
          placeholder="Search players..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Search players by name"
        />
      </div>
      <div className="text-xs text-muted-foreground mb-2" aria-live="polite" aria-atomic="true">
        {loading ? "Loading players..." : `${total.toLocaleString()} players found`}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10" aria-label="Loading">
            <Loader2 className="w-6 h-6 animate-spin text-accent" aria-hidden="true" />
            <span className="sr-only">Loading player data...</span>
          </div>
        )}
        <table className="w-full text-sm" role="table" aria-label="Player statistics table">
          <caption className="sr-only">
            Table showing player statistics including games played, total points, and points per game. Columns are sortable.
          </caption>
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium" scope="col">
                Rank
              </th>
              <th className="text-left px-4 py-3 font-medium" scope="col">
                <button
                  onClick={() => toggleSort("last_name")}
                  onKeyDown={(e) => handleSortKeyDown(e, "last_name")}
                  className="flex items-center gap-1 w-full text-left hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-sort={sortKey === "last_name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  aria-label={`Sort by name ${sortKey === "last_name" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                >
                  Name <SortIcon col="last_name" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-medium" scope="col">
                <button
                  onClick={() => toggleSort("total_games")}
                  onKeyDown={(e) => handleSortKeyDown(e, "total_games")}
                  className="flex items-center justify-end gap-1 w-full text-right hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-sort={sortKey === "total_games" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  aria-label={`Sort by games played ${sortKey === "total_games" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                >
                  Games <SortIcon col="total_games" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-medium" scope="col">
                <button
                  onClick={() => toggleSort("total_points")}
                  onKeyDown={(e) => handleSortKeyDown(e, "total_points")}
                  className="flex items-center justify-end gap-1 w-full text-right hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-sort={sortKey === "total_points" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  aria-label={`Sort by total points ${sortKey === "total_points" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                >
                  Points <SortIcon col="total_points" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-medium" scope="col">
                <button
                  onClick={() => toggleSort("ppg")}
                  onKeyDown={(e) => handleSortKeyDown(e, "ppg")}
                  className="flex items-center justify-end gap-1 w-full text-right hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-sort={sortKey === "ppg" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  aria-label={`Sort by points per game ${sortKey === "ppg" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                >
                  PPG <SortIcon col="ppg" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedPlayers.map((p, i) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <th className="px-4 py-3 text-muted-foreground font-normal" scope="row">
                  {page * perPage + i + 1}
                </th>
                <td className="px-4 py-3">
                  <Link 
                    href={`/players/${p.id}`} 
                    className="text-accent hover:underline font-medium"
                    aria-label={`View profile for ${p.first_name} ${p.last_name}`}
                  >
                    {p.first_name} {p.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums" aria-label={`${p.total_games} games played`}>
                  {p.total_games}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" aria-label={`${p.total_points} total points`}>
                  {p.total_points}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold" aria-label={`${p.ppg} points per game`}>
                  {p.ppg}
                </td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground" role="status">
                  No players found{query && ` for "${searchInput}"`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav aria-label="Player table pagination" className="flex items-center justify-between mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors disabled:cursor-not-allowed"
            aria-label={`Go to previous page ${page > 0 ? `(page ${page})` : ''}`}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground" aria-current="page">
            Page {page + 1} of {totalPages.toLocaleString()}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors disabled:cursor-not-allowed"
            aria-label={`Go to next page ${page + 2 <= totalPages ? `(page ${page + 2})` : ''}`}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
