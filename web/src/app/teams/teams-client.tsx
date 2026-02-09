"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { Team } from "@/lib/data";
import { FavouriteButton } from "@/components/favourite-button";

export function TeamsClient({ teams: teamsData }: { teams: Team[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 25;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return teamsData.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.org_name?.toLowerCase().includes(q)
    );
  }, [query, teamsData]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Team Directory</h1>
      <p className="text-muted-foreground mb-6">{teamsData.length.toLocaleString()} teams</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search teams..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Team</th>
              <th className="text-left px-4 py-3 font-medium">Organisation</th>
              <th className="text-left px-4 py-3 font-medium">Season</th>
              <th className="text-right px-4 py-3 font-medium">W</th>
              <th className="text-right px-4 py-3 font-medium">L</th>
              <th className="text-right px-4 py-3 font-medium">GP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <FavouriteButton id={t.id} type="team" />
                    <Link href={`/teams/${t.id}`} className="text-accent hover:underline font-medium">
                      {t.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.org_name || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.season_name || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-green-400">{t.wins}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">{t.losses}</td>
                <td className="px-4 py-3 text-right tabular-nums">{t.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg disabled:opacity-40 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  );
}
