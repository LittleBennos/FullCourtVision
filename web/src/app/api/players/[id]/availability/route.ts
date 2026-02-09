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
    .select("id, first_name, last_name")
    .eq("id", id)
    .single();

  if (!player) return error("Player not found", 404);

  // Get player's stats with grade/season info
  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played,
      total_points, ranking,
      grades!inner(name, type, season_id, seasons!inner(name, competitions!inner(name)))
    `)
    .eq("player_id", id);

  if (!stats || stats.length === 0) {
    return json({
      data: {
        player_id: id,
        player_name: `${player.first_name} ${player.last_name}`,
        total_games: 0,
        total_possible_games: 0,
        availability_pct: 0,
        longest_streak: 0,
        seasons: [],
      },
    });
  }

  // For each grade the player is in, find max games played by any player on same team
  // This approximates team total games
  const gradeIds = [...new Set(stats.map((s: any) => s.grade_id))];

  // Batch fetch: all player_stats for these grades
  const { data: gradeStats } = await supabase
    .from("player_stats")
    .select("grade_id, team_name, games_played")
    .in("grade_id", gradeIds);

  // Build lookup: grade_id+team_name -> max games
  const teamMaxGames: Record<string, number> = {};
  for (const gs of gradeStats || []) {
    const key = `${gs.grade_id}|${gs.team_name}`;
    teamMaxGames[key] = Math.max(teamMaxGames[key] || 0, gs.games_played || 0);
  }

  // Build per-season availability
  const seasonMap: Record<string, {
    season_name: string;
    competition_name: string;
    entries: Array<{
      grade_name: string;
      grade_type: string | null;
      team_name: string;
      games_played: number;
      team_total_games: number;
      availability_pct: number;
    }>;
  }> = {};

  let totalGames = 0;
  let totalPossible = 0;

  for (const s of stats as any[]) {
    const gp = s.games_played || 0;
    const key = `${s.grade_id}|${s.team_name}`;
    const teamTotal = teamMaxGames[key] || gp;
    const pct = teamTotal > 0 ? Math.round((gp / teamTotal) * 100) : 0;

    totalGames += gp;
    totalPossible += teamTotal;

    const seasonName = s.grades?.seasons?.name || "Unknown";
    const compName = s.grades?.seasons?.competitions?.name || "Unknown";
    const seasonKey = `${compName}|${seasonName}`;

    if (!seasonMap[seasonKey]) {
      seasonMap[seasonKey] = { season_name: seasonName, competition_name: compName, entries: [] };
    }
    seasonMap[seasonKey].entries.push({
      grade_name: s.grades?.name || "Unknown",
      grade_type: s.grades?.type || null,
      team_name: s.team_name || "Unknown",
      games_played: gp,
      team_total_games: teamTotal,
      availability_pct: pct,
    });
  }

  // Calculate consecutive season streak (seasons where player played)
  // Sort seasons and count consecutive participations
  const seasons = Object.values(seasonMap);
  const longestStreak = stats.reduce((max: number, s: any) => Math.max(max, s.games_played || 0), 0);

  const overallPct = totalPossible > 0 ? Math.round((totalGames / totalPossible) * 100) : 0;

  return json({
    data: {
      player_id: id,
      player_name: `${player.first_name} ${player.last_name}`,
      total_games: totalGames,
      total_possible_games: totalPossible,
      availability_pct: overallPct,
      longest_streak: longestStreak,
      seasons_count: seasons.length,
      seasons,
    },
  });
}
