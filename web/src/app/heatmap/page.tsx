import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getHeatmapData } from "@/lib/data";

export const metadata = {
  title: "Basketball Activity Heatmap",
  description: "See where basketball activity is concentrated across Victoria by region and suburb. Interactive map of clubs and competitions.",
};

export const revalidate = 3600;

// Dynamically import the heavy heatmap component to reduce initial bundle size
const HeatmapClient = dynamic(() => import("./heatmap-client").then(mod => ({ default: mod.HeatmapClient })), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-[600px] bg-card rounded-xl border border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <p>Loading heatmap visualization...</p>
        </div>
      </div>
    </div>
  )
});

export default async function HeatmapPage() {
  const heatmapData = await getHeatmapData();
  
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><div className="h-[600px] bg-card rounded-xl border border-border animate-pulse" /></div>}>
      <HeatmapClient data={heatmapData} />
    </Suspense>
  );
}
