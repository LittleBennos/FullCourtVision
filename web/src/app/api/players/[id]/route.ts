import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: player, error: dbError } = await supabase
    .from("players")
    .select("id, first_name, last_name, updated_at")
    .eq("id", id)
    .single();

  if (dbError || !player) return error("Player not found", 404);

  // Get aggregate career stats
  const { data: agg } = await supabase
    .from("player_aggregates")
    .select("total_games, total_points, total_threes, ppg")
    .eq("player_id", id)
    .single();

  return json({
    data: {
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      updated_at: player.updated_at,
      career_stats: agg
        ? { total_games: agg.total_games, total_points: agg.total_points, total_threes: agg.total_threes, ppg: +agg.ppg }
        : null,
    },
  });
}
