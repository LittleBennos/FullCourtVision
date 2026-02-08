"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { Organisation } from "@/lib/data";

export function OrganisationsClient({ organisations: organisationsData }: { organisations: Organisation[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 50;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return organisationsData.filter(
      (org) => 
        org.name?.toLowerCase().includes(q) || 
        org.suburb?.toLowerCase().includes(q) ||
        org.type?.toLowerCase().includes(q)
    );
  }, [query, organisationsData]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Organisation Directory</h1>
      <p className="text-muted-foreground mb-6">{organisationsData.length.toLocaleString()} organisations</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search organisations..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Organisation</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Suburb</th>
              <th className="text-left px-4 py-3 font-medium">State</th>
              <th className="text-left px-4 py-3 font-medium">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((org) => (
              <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/organisations/${org.id}`} className="text-accent hover:underline font-medium">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{org.type || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{org.suburb || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{org.state || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {org.website ? (
                    <a 
                      href={org.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
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