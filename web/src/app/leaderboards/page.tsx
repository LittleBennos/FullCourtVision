import { getLeaderboards } from "@/lib/data";
import { LeaderboardsClient } from "./leaderboards-client";

export const metadata = {
  title: "Leaderboards — FullCourtVision",
};

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage() {
  const leaderboards = await getLeaderboards();
  return <LeaderboardsClient leaderboards={leaderboards} />;
}
