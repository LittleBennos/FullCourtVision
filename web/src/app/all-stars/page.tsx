import { getAwardSeasons } from "@/lib/data";
import { AllStarsClient } from "./all-stars-client";

export const metadata = {
  title: "All-Star Team — FullCourtVision",
  description: "AI-generated best 5-player lineup by season with archetype balance and stat weighting.",
};

export const dynamic = "force-dynamic";

export default async function AllStarsPage() {
  const seasons = await getAwardSeasons();
  return <AllStarsClient seasons={seasons} />;
}
