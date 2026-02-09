import { getAwardSeasons, getSeasonAwards, SeasonAwards } from "@/lib/data";
import { AwardsClient } from "./awards-client";

export const metadata = {
  title: "Season Awards — FullCourtVision",
  description: "Season awards celebrating the best players and teams in Victorian basketball — MVP, Top Scorer, Most Improved, and more.",
};

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const seasons = await getAwardSeasons();
  
  // Only show the first 3 seasons
  const topSeasons = seasons.slice(0, 3);
  const awardsMap: Record<string, SeasonAwards> = {};
  
  // Pre-fetch just the first season to keep load time fast
  if (topSeasons.length > 0) {
    awardsMap[topSeasons[0].name] = await getSeasonAwards(topSeasons[0].name);
  }

  return <AwardsClient seasons={topSeasons} awardsMap={awardsMap} />;
}
