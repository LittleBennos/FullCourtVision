import { Suspense } from "react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Player Matchup Predictor",
  description: "Predict head-to-head outcomes between basketball players. Compare archetypes, stats, and win probability.",
};

const MatchupClient = dynamicImport(() => import("./matchup-client"), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <p>Loading matchup predictor...</p>
        </div>
      </div>
    </div>
  ),
});

export default function MatchupPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>}>
      <MatchupClient />
    </Suspense>
  );
}
