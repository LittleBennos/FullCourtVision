import { Metadata } from "next";
import { LiveGameClient } from "./live-game-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Game Day Experience | FullCourtVision",
  description: "Live game tracker with box scores, stat leaders, and game flow charts.",
};

export default async function LiveGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Games", href: "/games" },
          { label: "Game Day", href: `/games/${id}/live` },
        ]}
      />
      <LiveGameClient gameId={id} />
    </div>
  );
}
