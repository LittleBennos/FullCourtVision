import { PlayerTable } from "@/components/player-table";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata = {
  title: "Players — FullCourtVision",
  description: "Browse 57,000+ basketball players across Victoria. Search by name, view career stats and performance trends.",
};

export const revalidate = 3600;

export default async function PlayersPage() {
  // Just get the count for the header — table handles its own data fetching
  const { count } = await supabase
    .from("player_aggregates")
    .select("player_id", { count: "exact", head: true });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Player Directory</h1>
      <p className="text-muted-foreground mb-6">
        {(count || 0).toLocaleString()} players with recorded statistics
      </p>
      <PlayerTable />
    </div>
  );
}
