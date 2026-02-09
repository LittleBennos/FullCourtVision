import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";
import { detectAnomalies, type Anomaly } from "@/lib/anomalies";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name")
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

  const anomalies = detectAnomalies((stats || []) as any, player);

  return json({ data: anomalies });
}
