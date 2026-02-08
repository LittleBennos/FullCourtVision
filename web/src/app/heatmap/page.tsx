import { getHeatmapData } from "@/lib/data";
import { HeatmapClient } from "./heatmap-client";

export const metadata = {
  title: "Basketball Activity Heatmap",
  description: "See where basketball activity is concentrated across Victoria by region and suburb. Interactive map of clubs and competitions.",
};

export const dynamic = "force-dynamic";

export default async function HeatmapPage() {
  const heatmapData = await getHeatmapData();
  
  return (
    <HeatmapClient data={heatmapData} />
  );
}