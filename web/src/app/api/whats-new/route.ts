import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const playerIds = params.get("playerIds");

  if (!playerIds) return json({ data: [] });

  const ids = playerIds.split(",").filter(Boolean);
  if (ids.length === 0) return json({ data: [] });

  // 1. Get player_stats for followed players (with grade + team info)
  const { data: statsData, error: statsErr } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      players!inner(first_name, last_name),
      grades!inner(id, name, seasons!inner(name))
    `)
    .in("player_id", ids);

  if (statsErr) return error(statsErr.message, 500);
  if (!statsData || statsData.length === 0) return json({ data: [] });

  // 2. Collect all grade_ids and team_names to find recent games
  const gradeIds = [...new Set(statsData.map((s: any) => s.grade_id))];

  // 3. Get recent games for those grades
  const { data: gamesData, error: gamesErr } = await supabase
    .from("games")
    .select(`
      id, grade_id, home_team_id, away_team_id, home_score, away_score,
      date, time, venue, status,
      home_team:teams!home_team_id(id, name),
      away_team:teams!away_team_id(id, name),
      round:rounds!inner(grade_id)
    `)
    .in("round.grade_id", gradeIds)
    .eq("status", "FINAL")
    .order("date", { ascending: false })
    .limit(50);

  if (gamesErr) return error(gamesErr.message, 500);

  // 4. Build a map: grade_id -> games
  const gamesByGrade = new Map<string, any[]>();
  for (const g of gamesData || []) {
    const gid = (g as any).round?.grade_id;
    if (!gid) continue;
    if (!gamesByGrade.has(gid)) gamesByGrade.set(gid, []);
    gamesByGrade.get(gid)!.push(g);
  }

  // 5. Match players to their team's recent games
  const results: any[] = [];
  for (const stat of statsData) {
    const s = stat as any;
    const gradeGames = gamesByGrade.get(s.grade_id) || [];
    const teamName = s.team_name?.toLowerCase() || "";

    for (const game of gradeGames) {
      const homeTeamName = game.home_team?.name?.toLowerCase() || "";
      const awayTeamName = game.away_team?.name?.toLowerCase() || "";

      // Match player's team to home or away
      const isHome = homeTeamName.includes(teamName) || teamName.includes(homeTeamName);
      const isAway = awayTeamName.includes(teamName) || teamName.includes(awayTeamName);
      if (!isHome && !isAway) continue;

      const playerTeamScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;
      const opponentName = isHome ? game.away_team?.name : game.home_team?.name;
      const won = playerTeamScore > opponentScore;

      results.push({
        player_id: s.player_id,
        player_name: `${s.players?.first_name} ${s.players?.last_name}`,
        game_id: game.id,
        game_date: game.date,
        game_time: game.time,
        opponent: opponentName || "Unknown",
        team_score: playerTeamScore,
        opponent_score: opponentScore,
        won,
        team_name: s.team_name,
        grade_name: s.grades?.name,
        season_name: s.grades?.seasons?.name,
        season_stats: {
          games_played: s.games_played,
          total_points: s.total_points,
          ppg: s.games_played > 0 ? +(s.total_points / s.games_played).toFixed(1) : 0,
          two_point: s.two_point,
          three_point: s.three_point,
          total_fouls: s.total_fouls,
          ranking: s.ranking,
        },
      });
    }
  }

  // Sort by most recent game first, deduplicate by player+game
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = `${r.player_id}:${r.game_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => {
    const dateCompare = b.game_date.localeCompare(a.game_date);
    if (dateCompare !== 0) return dateCompare;
    return (b.game_time || "").localeCompare(a.game_time || "");
  });

  return json({ data: unique.slice(0, 20) });
}
