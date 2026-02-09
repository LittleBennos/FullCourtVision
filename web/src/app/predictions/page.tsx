import { Suspense } from "react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Game Predictions | FullCourtVision",
  description: "Predict head-to-head outcomes between teams based on historical data, roster strength, and win-loss records.",
};

const PredictionsClient = dynamicImport(() => import("./predictions-client"), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <p>Loading predictions...</p>
        </div>
      </div>
    </div>
  ),
});

export default function PredictionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>}>
      <PredictionsClient />
    </Suspense>
  );
}
