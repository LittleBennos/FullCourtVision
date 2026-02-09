import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Get grade info
  const { data: grade } = await supabase
    .from("grades")
    .select(`
      id, name, type, season_id,
      seasons!inner(name, competition_id, competitions!inner(name, organisation_id, organisations!inner(name)))
    `)
    .eq("id", id)
    .single();

  if (!grade) {
    return NextResponse.json({ error: "Grade not found" }, { status: 404 });
  }

  // Get player stats for this grade
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      player_id, team_name, games_played, total_points, total_fouls,
      players!inner(first_name, last_name)
    `)
    .eq("grade_id", id)
    .gte("games_played", 1);

  // Get games for this grade
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("grade_id", id)
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  // Get teams
  const { data: gradeTeams } = await supabase
    .from("player_stats")
    .select("team_name")
    .eq("grade_id", id);

  const teamNames = [...new Set((gradeTeams || []).map(t => t.team_name).filter(Boolean))];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", grade.season_id)
    .in("name", teamNames.length > 0 ? teamNames : ["__none__"]);

  // Calculate stats
  const stats = playerStats || [];
  const totalPlayers = new Set(stats.map(s => s.player_id)).size;
  const totalGames = (games || []).length;
  const totalPoints = stats.reduce((sum, s) => sum + (s.total_points || 0), 0);
  const totalFouls = stats.reduce((sum, s) => sum + (s.total_fouls || 0), 0);
  const totalGamesPlayed = stats.reduce((sum, s) => sum + (s.games_played || 0), 0);

  const avgPPG = totalGamesPlayed > 0 ? +(totalPoints / totalGamesPlayed).toFixed(1) : 0;
  const avgFouls = totalGamesPlayed > 0 ? +(totalFouls / totalGamesPlayed).toFixed(1) : 0;

  // Top scorer
  const playerMap = new Map<string, { name: string; points: number; games: number }>();
  for (const s of stats) {
    const pid = s.player_id;
    const existing = playerMap.get(pid);
    const pName = `${(s.players as any).first_name} ${(s.players as any).last_name}`;
    if (existing) {
      existing.points += s.total_points || 0;
      existing.games += s.games_played || 0;
    } else {
      playerMap.set(pid, { name: pName, points: s.total_points || 0, games: s.games_played || 0 });
    }
  }
  const topScorer = Array.from(playerMap.values()).sort((a, b) => b.points - a.points)[0] || null;

  // Competitiveness index: stdev of win percentages
  const teamStatsMap = new Map<string, { wins: number; losses: number }>();
  if (teams) {
    for (const team of teams) {
      teamStatsMap.set(team.id, { wins: 0, losses: 0 });
    }
  }
  if (games) {
    for (const game of games) {
      const home = teamStatsMap.get(game.home_team_id);
      const away = teamStatsMap.get(game.away_team_id);
      if (home && away) {
        if ((game.home_score || 0) > (game.away_score || 0)) {
          home.wins++;
          away.losses++;
        } else {
          away.wins++;
          home.losses++;
        }
      }
    }
  }

  const winPcts = Array.from(teamStatsMap.values())
    .filter(t => t.wins + t.losses > 0)
    .map(t => t.wins / (t.wins + t.losses));

  let competitivenessIndex = 0;
  if (winPcts.length > 1) {
    const mean = winPcts.reduce((a, b) => a + b, 0) / winPcts.length;
    const variance = winPcts.reduce((sum, p) => sum + (p - mean) ** 2, 0) / winPcts.length;
    competitivenessIndex = +Math.sqrt(variance).toFixed(3);
  }

  // Avg score per game (total points scored across all games / number of games)
  let avgGameScore = 0;
  if (games && games.length > 0) {
    const totalGamePoints = games.reduce((sum, g) => sum + (g.home_score || 0) + (g.away_score || 0), 0);
    avgGameScore = +(totalGamePoints / games.length / 2).toFixed(1); // per team per game
  }

  return NextResponse.json({
    id: grade.id,
    name: grade.name,
    type: grade.type,
    season_name: (grade.seasons as any)?.name || "",
    competition_name: (grade.seasons as any)?.competitions?.name || "",
    org_name: (grade.seasons as any)?.competitions?.organisations?.name || "",
    totalPlayers,
    totalGames,
    totalTeams: teamStatsMap.size,
    avgPPG,
    avgFouls,
    avgGameScore,
    topScorer: topScorer ? { name: topScorer.name, points: topScorer.points, games: topScorer.games } : null,
    competitivenessIndex,
  });
}
