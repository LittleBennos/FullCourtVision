import { getLeaderboards, getAvailableSeasons } from "@/lib/data";
import { LeaderboardsClient } from "./leaderboards-client";

export const metadata = {
  title: "Leaderboards — FullCourtVision",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ season?: string }>;
};

export default async function LeaderboardsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const seasonId = resolvedSearchParams.season;
  const [leaderboards, seasons] = await Promise.all([
    getLeaderboards(seasonId),
    getAvailableSeasons(),
  ]);
  
  return (
    <LeaderboardsClient 
      leaderboards={leaderboards} 
      seasons={seasons}
      selectedSeasonId={seasonId}
    />
  );
}
