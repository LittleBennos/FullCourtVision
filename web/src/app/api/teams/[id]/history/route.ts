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

  // 1. Get the team to find its name and organisation
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("id", id)
    .single();

  if (teamErr || !team) return error("Team not found", 404);

  // 2. Find all teams with the same name under the same organisation (across seasons)
  const { data: relatedTeams } = await supabase
    .from("teams")
    .select("id, name, season_id, seasons(id, name)")
    .eq("name", team.name)
    .eq("organisation_id", team.organisation_id)
    .order("season_id", { ascending: true });

  if (!relatedTeams || relatedTeams.length === 0) {
    return json({ data: { team_name: team.name, organisation_name: (team.organisations as any)?.name || "", seasons: [] } });
  }

  // 3. For each related team, get its roster from player_stats
  const seasonRosters: Array<{
    season_id: string;
    season_name: string;
    team_id: string;
    players: Array<{ id: string; first_name: string; last_name: string; games_played: number; total_points: number }>;
  }> = [];

  for (const rt of relatedTeams) {
    const { data: grades } = await supabase.from("grades").select("id").eq("season_id", rt.season_id);
    if (!grades || grades.length === 0) {
      seasonRosters.push({
        season_id: rt.season_id,
        season_name: (rt.seasons as any)?.name || "",
        team_id: rt.id,
        players: [],
      });
      continue;
    }

    const { data: stats } = await supabase
      .from("player_stats")
      .select("player_id, games_played, total_points, players!inner(first_name, last_name)")
      .eq("team_name", rt.name)
      .in("grade_id", grades.map((g: any) => g.id));

    // Aggregate by player
    const pm = new Map<string, any>();
    for (const s of stats || []) {
      const existing = pm.get(s.player_id);
      if (existing) {
        existing.games_played += s.games_played || 0;
        existing.total_points += s.total_points || 0;
      } else {
        pm.set(s.player_id, {
          id: s.player_id,
          first_name: (s.players as any)?.first_name || "",
          last_name: (s.players as any)?.last_name || "",
          games_played: s.games_played || 0,
          total_points: s.total_points || 0,
        });
      }
    }

    seasonRosters.push({
      season_id: rt.season_id,
      season_name: (rt.seasons as any)?.name || "",
      team_id: rt.id,
      players: Array.from(pm.values()).sort((a, b) => b.total_points - a.total_points),
    });
  }

  // 4. Compute joins/departures/retained for each season
  const seasons = seasonRosters.map((sr, idx) => {
    const currentIds = new Set(sr.players.map(p => p.id));
    const prevIds = idx > 0 ? new Set(seasonRosters[idx - 1].players.map(p => p.id)) : new Set<string>();

    const joined = sr.players.filter(p => !prevIds.has(p.id));
    const departed = idx > 0 ? seasonRosters[idx - 1].players.filter(p => !currentIds.has(p.id)) : [];
    const retained = sr.players.filter(p => prevIds.has(p.id));

    return {
      season_id: sr.season_id,
      season_name: sr.season_name,
      team_id: sr.team_id,
      roster: sr.players,
      joined,
      departed,
      retained,
      roster_size: sr.players.length,
    };
  });

  return json({
    data: {
      team_name: team.name,
      organisation_name: (team.organisations as any)?.name || "",
      current_team_id: id,
      seasons,
    },
  });
}
