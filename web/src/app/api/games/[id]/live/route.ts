import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Game details
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select(`
      id, home_team_id, away_team_id, home_score, away_score,
      venue, date, time, round_id, grade_id, status
    `)
    .eq("id", id)
    .single();

  if (gameErr || !game) return error("Game not found", 404);

  // 2. Teams
  const [homeRes, awayRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", game.home_team_id).single(),
    supabase.from("teams").select("id, name").eq("id", game.away_team_id).single(),
  ]);

  // 3. Round / grade / season / competition hierarchy
  let roundInfo: any = null;
  if (game.round_id) {
    const { data: round } = await supabase
      .from("rounds")
      .select("id, name, grade_id")
      .eq("id", game.round_id)
      .single();
    if (round) {
      const { data: grade } = await supabase
        .from("grades")
        .select("id, name, season_id")
        .eq("id", round.grade_id)
        .single();
      if (grade) {
        const { data: season } = await supabase
          .from("seasons")
          .select("id, name, competition_id")
          .eq("id", grade.season_id)
          .single();
        if (season) {
          const { data: comp } = await supabase
            .from("competitions")
            .select("id, name")
            .eq("id", season.competition_id)
            .single();
          roundInfo = {
            id: round.id,
            name: round.name,
            grade: { id: grade.id, name: grade.name, season: { id: season.id, name: season.name, competition: comp } },
          };
        }
      }
    }
  }

  // 4. Player stats for both teams in this grade
  const gradeId = game.grade_id || roundInfo?.grade?.id;
  let homePlayerStats: any[] = [];
  let awayPlayerStats: any[] = [];

  if (gradeId && homeRes.data && awayRes.data) {
    const [homeStatsRes, awayStatsRes] = await Promise.all([
      supabase
        .from("player_stats")
        .select("*, player:players(id, first_name, last_name)")
        .eq("grade_id", gradeId)
        .eq("team_name", homeRes.data.name),
      supabase
        .from("player_stats")
        .select("*, player:players(id, first_name, last_name)")
        .eq("grade_id", gradeId)
        .eq("team_name", awayRes.data.name),
    ]);
    homePlayerStats = (homeStatsRes.data || []).map(formatPlayerStat);
    awayPlayerStats = (awayStatsRes.data || []).map(formatPlayerStat);
  }

  // 5. Other games in the same round (for context / quarter simulation)
  let roundGames: any[] = [];
  if (game.round_id) {
    const { data: rg } = await supabase
      .from("games")
      .select("id, home_team_id, away_team_id, home_score, away_score")
      .eq("round_id", game.round_id)
      .neq("id", id);
    roundGames = (rg || []).map((g: any) => ({
      id: g.id,
      home_score: g.home_score,
      away_score: g.away_score,
    }));
  }

  return json({
    game: {
      id: game.id,
      home_team: homeRes.data,
      away_team: awayRes.data,
      home_score: game.home_score,
      away_score: game.away_score,
      venue: game.venue,
      date: game.date,
      time: game.time,
      status: game.status,
      round: roundInfo,
    },
    home_players: homePlayerStats,
    away_players: awayPlayerStats,
    round_games: roundGames,
  });
}

function formatPlayerStat(ps: any) {
  const gp = ps.games_played || 1;
  return {
    player_id: ps.player?.id || ps.player_id,
    first_name: ps.player?.first_name || "",
    last_name: ps.player?.last_name || "",
    games_played: ps.games_played,
    total_points: ps.total_points || 0,
    ppg: ps.total_points ? +(ps.total_points / gp).toFixed(1) : 0,
    one_point: ps.one_point || 0,
    two_point: ps.two_point || 0,
    three_point: ps.three_point || 0,
    total_fouls: ps.total_fouls || 0,
    fpg: ps.total_fouls ? +(ps.total_fouls / gp).toFixed(1) : 0,
    ranking: ps.ranking,
  };
}
