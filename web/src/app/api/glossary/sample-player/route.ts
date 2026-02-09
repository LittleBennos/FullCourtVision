import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  // Pick a player with decent stats for a meaningful example
  const { data, error } = await supabase
    .from("player_stats")
    .select("player_id, players!inner(id, first_name, last_name), games_played, total_points, one_point, two_point, three_point, total_fouls")
    .gte("games_played", 10)
    .gte("total_points", 50)
    .order("total_points", { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ player: null });
  }

  // Pick a random one from top 20 for variety
  const row = data[Math.floor(Math.random() * data.length)];
  const p = row.players as any;

  return NextResponse.json({
    player: {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      games_played: row.games_played,
      total_points: row.total_points,
      one_point: row.one_point || 0,
      two_point: row.two_point || 0,
      three_point: row.three_point || 0,
      total_fouls: row.total_fouls || 0,
    },
  });
}
