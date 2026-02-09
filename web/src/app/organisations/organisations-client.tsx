"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SortableHeader } from "@/components/filters";

type OrgWithCounts = {
  id: string;
  name: string;
  type: string | null;
  suburb: string | null;
  state: string | null;
  website: string | null;
  team_count: number;
};

type SortKey = "name" | "type" | "suburb" | "team_count";

export function OrganisationsClient({ organisations }: { organisations: OrgWithCounts[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSort = (searchParams.get("sort") as SortKey) || "name";
  const initialDir = (searchParams.get("dir") as "asc" | "desc") || "asc";

  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialDir);
  const [page, setPage] = useState(0);
  const perPage = 50;

  const updateUrl = (sort: string, dir: string) => {
    const p = new URLSearchParams();
    if (query) p.set("search", query);
    if (sort !== "name") p.set("sort", sort);
    if (dir !== "asc") p.set("dir", dir);
    const qs = p.toString();
    router.replace(`/organisations${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = organisations.filter(
      (org) =>
        org.name?.toLowerCase().includes(q) ||
        org.suburb?.toLowerCase().includes(q) ||
        org.type?.toLowerCase().includes(q)
    );

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "type": cmp = (a.type || "").localeCompare(b.type || ""); break;
        case "suburb": cmp = (a.suburb || "").localeCompare(b.suburb || ""); break;
        case "team_count": cmp = a.team_count - b.team_count; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [query, organisations, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  function toggleSort(key: string) {
    const k = key as SortKey;
    let newDir: "asc" | "desc";
    if (sortKey === k) {
      newDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      newDir = k === "team_count" ? "desc" : "asc";
    }
    setSortKey(k);
    setSortDir(newDir);
    setPage(0);
    updateUrl(k, newDir);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Organisation Directory</h1>
      <p className="text-muted-foreground mb-6">{organisations.length.toLocaleString()} organisations</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search organisations..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        {filtered.length.toLocaleString()} organisations{query ? " (filtered)" : ""}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <SortableHeader label="Organisation" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Type" sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Suburb" sortKey="suburb" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <th className="text-left px-4 py-3 font-medium">State</th>
              <SortableHeader label="Teams" sortKey="team_count" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
              <th className="text-left px-4 py-3 font-medium">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((org) => (
              <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/organisations/${org.id}`} className="text-blue-400 hover:underline font-medium">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{org.type || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{org.suburb || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{org.state || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{org.team_count}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {org.website ? (
                    <a href={org.website} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                      View
                    </a>
                  ) : "-"}
                </td>
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
