"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface SeasonFilterProps {
  seasons: { id: string; name: string }[];
  currentSeason?: string;
}

export function SeasonFilter({ seasons, currentSeason }: SeasonFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={currentSeason || ""}
      onChange={(e) => {
        const val = e.target.value;
        const url = val ? `${pathname}?season=${val}` : pathname;
        router.push(url);
      }}
      className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="">All Seasons</option>
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
