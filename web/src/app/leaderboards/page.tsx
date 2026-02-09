import { getLeaderboards, getAvailableSeasons } from "@/lib/data";
import { LeaderboardsClient } from "./leaderboards-client";

export const metadata = {
  title: "Leaderboards",
  description: "Top scorers, most games played, and statistical leaders across all Victorian basketball competitions.",
  alternates: {
    canonical: "https://fullcourtvision.vercel.app/leaderboards",
  },
  openGraph: {
    title: "Leaderboards | FullCourtVision",
    description: "Top scorers, most games played, and statistical leaders across all Victorian basketball competitions.",
    url: "https://fullcourtvision.vercel.app/leaderboards",
    type: "website",
    siteName: "FullCourtVision",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboards | FullCourtVision",
    description: "Top scorers, most games played, and statistical leaders across all Victorian basketball competitions.",
  },
};

export const revalidate = 3600;

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
