import { getAwardSeasons, getSeasonAwards, SeasonAwards } from "@/lib/data";
import { AwardsPageClient } from "./awards-page-client";

export const metadata = {
  title: "Awards — FullCourtVision",
  description: "Season awards and stat leaders celebrating the best players in Victorian basketball — MVP, Top Scorer, Sharpshooter, Paint Beast, and more.",
};

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const seasons = await getAwardSeasons();
  const topSeasons = seasons.slice(0, 3);
  const awardsMap: Record<string, SeasonAwards> = {};

  if (topSeasons.length > 0) {
    awardsMap[topSeasons[0].name] = await getSeasonAwards(topSeasons[0].name);
  }

  return <AwardsPageClient seasons={topSeasons} awardsMap={awardsMap} />;
}
