import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", id)
    .single();

  if (!player) return error("Player not found", 404);

  const { data: stats, error: dbError } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(name, type, seasons!inner(name, competitions!inner(name)))
    `)
    .eq("player_id", id);

  if (dbError) return error(dbError.message, 500);

  return json({
    data: (stats || []).map((s: any) => ({
      id: s.id,
      grade_id: s.grade_id,
      team_name: s.team_name,
      games_played: s.games_played,
      total_points: s.total_points,
      one_point: s.one_point,
      two_point: s.two_point,
      three_point: s.three_point,
      total_fouls: s.total_fouls,
      ranking: s.ranking,
      ppg: s.games_played > 0 ? +(s.total_points / s.games_played).toFixed(1) : 0,
      grade_name: s.grades?.name,
      grade_type: s.grades?.type,
      season_name: s.grades?.seasons?.name,
      competition_name: s.grades?.seasons?.competitions?.name,
    })),
  });
}
