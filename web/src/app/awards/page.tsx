import { getAwardSeasons, getSeasonAwards, SeasonAwards } from "@/lib/data";
import { AwardsClient } from "./awards-client";

export const metadata = {
  title: "Season Awards — FullCourtVision",
  description: "Season awards celebrating the best players and teams in Victorian basketball — MVP, Top Scorer, Most Improved, and more.",
};

export const revalidate = 3600;

export default async function AwardsPage() {
  const seasons = await getAwardSeasons();
  
  // Pre-fetch awards for the first 3 seasons
  const topSeasons = seasons.slice(0, 3);
  const awardsMap: Record<string, SeasonAwards> = {};
  
  for (const season of topSeasons) {
    awardsMap[season.name] = await getSeasonAwards(season.name);
  }

  return <AwardsClient seasons={topSeasons} awardsMap={awardsMap} />;
}
