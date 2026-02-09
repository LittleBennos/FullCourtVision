import { Suspense } from "react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Win Probability Model | FullCourtVision",
  description:
    "Calculate win probabilities between any two teams using offensive/defensive stats, head-to-head records, recent form, and 3PT shooting.",
};

const WinProbabilityClient = dynamicImport(
  () => import("./win-probability-client"),
  {
    loading: () => (
      <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <p>Loading win probability model...</p>
          </div>
        </div>
      </div>
    ),
  }
);

export default function WinProbabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">
          Loading...
        </div>
      }
    >
      <WinProbabilityClient />
    </Suspense>
  );
}
