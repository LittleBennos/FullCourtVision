import { Suspense } from "react";
import { RankingsClient } from "./rankings-client";

export const metadata = {
  title: "Power Rankings",
  description: "Composite team power rankings across Victorian basketball — based on win rate, point differential, scoring talent, and bench depth.",
};

export default function RankingsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-center text-muted-foreground">Loading rankings…</div>}>
      <RankingsClient />
    </Suspense>
  );
}
