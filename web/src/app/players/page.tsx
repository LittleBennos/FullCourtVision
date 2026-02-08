import { getAllPlayers } from "@/lib/data";
import { PlayerTable } from "@/components/player-table";

export const metadata = {
  title: "Players — FullCourtVision",
  description: "Browse all basketball players across Victoria",
};

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getAllPlayers();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Player Directory</h1>
      <p className="text-muted-foreground mb-6">
        {players.length.toLocaleString()} players with recorded statistics
      </p>
      <PlayerTable players={players} />
    </div>
  );
}
