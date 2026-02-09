import { createClient } from "@supabase/supabase-js";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch career aggregates
    const { data: aggregates, error: aggErr } = await supabase
      .from("player_aggregates")
      .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg, seasons_played");

    if (aggErr) return error(aggErr.message, 500);
    const agg = aggregates || [];

    // Fetch per-grade stats for season records
    const { data: stats, error: statsErr } = await supabase
      .from("player_stats")
      .select("player_id, players!inner(first_name, last_name), games_played, total_points, three_point, total_fouls, grades!inner(season_id, seasons!inner(name))");

    if (statsErr) return error(statsErr.message, 500);

    // Build per-season aggregates
    const seasonMap = new Map<string, any>();
    for (const r of stats || []) {
      const seasonName = (r.grades as any)?.seasons?.name || (r.grades as any)?.season_id || "Unknown";
      const key = `${r.player_id}__${seasonName}`;
      const existing = seasonMap.get(key);
      if (existing) {
        existing.games += r.games_played || 0;
        existing.points += r.total_points || 0;
        existing.threes += r.three_point || 0;
        existing.fouls += r.total_fouls || 0;
      } else {
        seasonMap.set(key, {
          player_id: r.player_id,
          first_name: (r.players as any)?.first_name || "",
          last_name: (r.players as any)?.last_name || "",
          season: seasonName,
          games: r.games_played || 0,
          points: r.total_points || 0,
          threes: r.three_point || 0,
          fouls: r.total_fouls || 0,
        });
      }
    }
    const seasonRows = Array.from(seasonMap.values());

    // === ALL-TIME CAREER LEADERS ===
    const mostPoints = [...agg].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.total_points || 0, games: r.total_games,
    }));

    const mostGames = [...agg].sort((a, b) => (b.total_games || 0) - (a.total_games || 0)).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.total_games || 0,
    }));

    const highestPPG = [...agg].filter(r => (r.total_games || 0) >= 10)
      .sort((a, b) => (b.ppg || 0) - (a.ppg || 0)).slice(0, 5).map(r => ({
        player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
        value: +(r.ppg || 0).toFixed(1), games: r.total_games,
      }));

    const mostThrees = [...agg].sort((a, b) => (b.total_threes || 0) - (a.total_threes || 0)).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.total_threes || 0, games: r.total_games,
    }));

    // === SINGLE-SEASON RECORDS ===
    const seasonWithPPG = seasonRows.filter(r => r.games >= 5).map(r => ({
      ...r, ppg: +(r.points / r.games).toFixed(1),
    }));

    const seasonHighestPPG = [...seasonWithPPG].sort((a, b) => b.ppg - a.ppg).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.ppg, season: r.season, games: r.games,
    }));

    const seasonMostPoints = [...seasonRows].sort((a, b) => b.points - a.points).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.points, season: r.season, games: r.games,
    }));

    const seasonMostThrees = [...seasonRows].sort((a, b) => b.threes - a.threes).slice(0, 5).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: r.threes, season: r.season, games: r.games,
    }));

    // === EFFICIENCY RECORDS ===
    // Best 3PT% (need per-season 3PT attempted — approximate with threes made, min 10 made)
    // We don't have 3PT attempts, so use career threes / games as a proxy for volume
    const best3PTShooters = [...agg].filter(r => (r.total_threes || 0) >= 10 && (r.total_games || 0) >= 10)
      .map(r => ({
        player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
        value: +((r.total_threes || 0) / (r.total_games || 1)).toFixed(2),
        label: "3PT/game", threes: r.total_threes, games: r.total_games,
      }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    const lowestFouls = seasonRows.filter(r => r.games >= 10).map(r => ({
      player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
      value: +(r.fouls / r.games).toFixed(2), season: r.season, games: r.games,
    })).sort((a, b) => a.value - b.value).slice(0, 5);

    // === HALL OF FAME NOMINEES ===
    // Score = (career PPG * 3) + (total_games * 0.5) + (seasons_played * 5) + (total_points * 0.02)
    const nominees = [...agg]
      .filter(r => (r.total_games || 0) >= 15 && (r.seasons_played || 0) >= 2)
      .map(r => {
        const ppg = r.ppg || 0;
        const games = r.total_games || 0;
        const seasons = r.seasons_played || 0;
        const points = r.total_points || 0;
        const score = (ppg * 3) + (games * 0.5) + (seasons * 5) + (points * 0.02);
        return {
          player_id: r.player_id, first_name: r.first_name, last_name: r.last_name,
          ppg: +ppg.toFixed(1), games, seasons, total_points: points,
          score: +score.toFixed(1),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return json({
      career_leaders: {
        most_points: mostPoints,
        most_games: mostGames,
        highest_ppg: highestPPG,
        most_threes: mostThrees,
      },
      season_records: {
        highest_ppg: seasonHighestPPG,
        most_points: seasonMostPoints,
        most_threes: seasonMostThrees,
      },
      efficiency: {
        best_three_point_rate: best3PTShooters,
        lowest_fouls_per_game: lowestFouls,
      },
      hall_of_fame: nominees,
    });
  } catch (e: any) {
    return error(e.message || "Internal error", 500);
  }
}
