import { Suspense } from "react";
import { getHeatmapData } from "@/lib/data";
import { HeatmapClient } from "./heatmap-client";

export const metadata = {
  title: "Basketball Activity Heatmap",
  description: "See where basketball activity is concentrated across Victoria by region and suburb. Interactive map of clubs and competitions.",
};

export const revalidate = 3600;

export default async function HeatmapPage() {
  const heatmapData = await getHeatmapData();
  
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><div className="h-[600px] bg-card rounded-xl border border-border animate-pulse" /></div>}>
      <HeatmapClient data={heatmapData} />
    </Suspense>
  );
}
