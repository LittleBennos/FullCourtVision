"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
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
        page: page.toString(),
        perPage: perPage.toString(),
        search: query,
        sortBy: sortKey,
        sortDir: sortDir,
      });
      const res = await fetch(`/api/players?${params}`);
      const data = await res.json();
      setPlayers(data.players);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to fetch players", e);
    } finally {
      setLoading(false);
    }
  }, [page, query, sortKey, sortDir]);

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

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search players..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {loading ? "Loading..." : `${total.toLocaleString()} players`}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("last_name")}>
                <span className="flex items-center gap-1">Name <SortIcon col="last_name" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("total_games")}>
                <span className="flex items-center justify-end gap-1">Games <SortIcon col="total_games" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("total_points")}>
                <span className="flex items-center justify-end gap-1">Points <SortIcon col="total_points" /></span>
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("ppg")}>
                <span className="flex items-center justify-end gap-1">PPG <SortIcon col="ppg" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players.map((p, i) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{page * perPage + i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/players/${p.id}`} className="text-accent hover:underline font-medium">
                    {p.first_name} {p.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.total_games}</td>
                <td className="px-4 py-3 text-right tabular-nums">{p.total_points}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.ppg}</td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No players found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages.toLocaleString()}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
