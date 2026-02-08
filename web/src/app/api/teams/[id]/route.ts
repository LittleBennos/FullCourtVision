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

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("id", id)
    .single();

  if (teamErr || !team) return error("Team not found", 404);

  // Record & roster in parallel
  const [homeRes, awayRes, rosterRes] = await Promise.all([
    supabase.from("games").select("home_score, away_score").eq("home_team_id", id).not("home_score", "is", null),
    supabase.from("games").select("home_score, away_score").eq("away_team_id", id).not("home_score", "is", null),
    // Roster: player_stats matching this team name within this season's grades
    (async () => {
      const { data: grades } = await supabase.from("grades").select("id").eq("season_id", team.season_id);
      if (!grades || grades.length === 0) return [];
      const { data: stats } = await supabase
        .from("player_stats")
        .select("player_id, games_played, total_points, one_point, two_point, three_point, total_fouls, players!inner(first_name, last_name)")
        .eq("team_name", team.name)
        .in("grade_id", grades.map((g: any) => g.id));
      return stats || [];
    })(),
  ]);

  let wins = 0, losses = 0, gp = 0;
  for (const g of homeRes.data || []) { gp++; g.home_score > g.away_score ? wins++ : losses++; }
  for (const g of awayRes.data || []) { gp++; g.away_score > g.home_score ? wins++ : losses++; }

  // Aggregate roster by player
  const pm = new Map<string, any>();
  for (const s of rosterRes as any[]) {
    const p = pm.get(s.player_id);
    if (p) {
      p.games_played += s.games_played || 0;
      p.total_points += s.total_points || 0;
    } else {
      pm.set(s.player_id, {
        id: s.player_id,
        first_name: s.players?.first_name || "",
        last_name: s.players?.last_name || "",
        games_played: s.games_played || 0,
        total_points: s.total_points || 0,
      });
    }
  }

  const roster = Array.from(pm.values())
    .map((p) => ({ ...p, ppg: p.games_played > 0 ? +(p.total_points / p.games_played).toFixed(1) : 0 }))
    .sort((a, b) => b.total_points - a.total_points);

  return json({
    data: {
      id: team.id,
      name: team.name,
      organisation_id: team.organisation_id,
      organisation_name: (team.organisations as any)?.name || "",
      season_id: team.season_id,
      season_name: (team.seasons as any)?.name || "",
      record: { wins, losses, games_played: gp },
      roster,
    },
  });
}
