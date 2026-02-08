"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  total_points: number;
  ppg: number;
};

type SortKey = "last_name" | "total_games" | "total_points" | "ppg";

export function PlayerTable({ players, limit }: { players: Player[]; limit?: number }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const perPage = limit || 25;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    );
    result.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [players, query, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

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
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="text-xs text-muted-foreground mb-2">{filtered.length.toLocaleString()} players</div>
      <div className="overflow-x-auto rounded-xl border border-border">
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
            {paged.map((p, i) => (
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
            Page {page + 1} of {totalPages}
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
