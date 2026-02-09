import { TimelineClient } from "./timeline-client";

export const metadata = {
  title: "Season Timeline — FullCourtVision",
  description:
    "Interactive timeline of key moments across basketball seasons — highest-scoring games, biggest upsets, and milestone performances.",
};

export const dynamic = "force-dynamic";

export default function TimelinePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Season Timeline
        </h1>
        <p className="text-muted-foreground mt-2">
          Key moments and milestones across recent seasons
        </p>
      </div>
      <TimelineClient />
    </main>
  );
}
