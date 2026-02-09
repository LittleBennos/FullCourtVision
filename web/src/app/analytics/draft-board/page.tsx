import { getAvailableSeasons } from "@/lib/data";
import { DraftBoardClient } from "./draft-board-client";

export const metadata = {
  title: "Draft Board — Prospect Rankings | FullCourtVision",
  description:
    "Player prospect rankings with composite scoring based on PER, scoring trends, consistency, and games played.",
};

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ season?: string; grade?: string }>;
};

async function fetchDraftBoard(season?: string, grade?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = new URL("/api/analytics/draft-board", baseUrl);
  if (season) url.searchParams.set("season", season);
  if (grade) url.searchParams.set("grade", grade);
  url.searchParams.set("limit", "500");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return { data: [], meta: { total: 0, season: "all", grade: "all" } };
  return res.json();
}

export default async function DraftBoardPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const [boardData, seasons] = await Promise.all([
    fetchDraftBoard(resolvedParams.season, resolvedParams.grade),
    getAvailableSeasons(),
  ]);

  return (
    <DraftBoardClient
      initialData={boardData}
      seasons={seasons.map((s) => ({ id: s.id, name: s.name, competition_name: s.competition_name }))}
      selectedSeason={resolvedParams.season}
    />
  );
}
