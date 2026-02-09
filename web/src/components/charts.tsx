"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return (
    <div className="h-72 flex items-center justify-center text-muted-foreground animate-pulse">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-muted" />
        <span className="text-sm">Loading chart…</span>
      </div>
    </div>
  );
}

// Lazy-loaded Recharts components — keeps them out of the main bundle
const ScoringTrendChartInner = dynamic(
  () => import("./charts-inner").then((m) => m.ScoringTrendChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const ShotBreakdownChartInner = dynamic(
  () => import("./charts-inner").then((m) => m.ShotBreakdownChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export function ScoringTrendChart({ data }: { data: { name: string; ppg: number; totalPoints: number }[] }) {
  return <ScoringTrendChartInner data={data} />;
}

export function ShotBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  return <ShotBreakdownChartInner data={data} />;
}

const MarginDistributionChartInner = dynamic(
  () => import("./charts-inner").then((m) => m.MarginDistributionChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const DailyGamesChartInner = dynamic(
  () => import("./charts-inner").then((m) => m.DailyGamesChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export function MarginDistributionChart({ data }: { data: { range: string; count: number }[] }) {
  return <MarginDistributionChartInner data={data} />;
}

export function DailyGamesChart({ data }: { data: { date: string; games: number; points: number }[] }) {
  return <DailyGamesChartInner data={data} />;
}
