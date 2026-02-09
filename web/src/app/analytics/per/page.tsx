import { getAvailableSeasons } from "@/lib/data";
import { PERClient } from "./per-client";

export const metadata = {
  title: "Player Efficiency Ratings (PER)",
  description:
    "Player Efficiency Rating leaderboard — see the most efficient basketball players across Victorian competitions, normalized to league average of 15.",
};

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ season?: string; grade?: string }>;
};

async function fetchPERData(season?: string, grade?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = new URL("/api/analytics/per", baseUrl);
  if (season) url.searchParams.set("season", season);
  if (grade) url.searchParams.set("grade", grade);
  url.searchParams.set("limit", "500");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return { data: [], meta: { total: 0, season: "all", grade: "all", league_avg_per: 15 } };
  return res.json();
}

export default async function PERPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const [perData, seasons] = await Promise.all([
    fetchPERData(resolvedParams.season, resolvedParams.grade),
    getAvailableSeasons(),
  ]);

  return (
    <PERClient
      initialData={perData}
      seasons={seasons.map((s) => ({ id: s.id, name: s.name, competition_name: s.competition_name }))}
      selectedSeason={resolvedParams.season}
    />
  );
}
