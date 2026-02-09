import { createClient } from "@supabase/supabase-js";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CLOSE_GAME_MARGIN = 5;

export async function GET() {
  try {
    // 1. Fetch all completed games with scores
    const { data: games, error: gErr } = await supabase
      .from("games")
      .select("id, home_team_id, away_team_id, home_score, away_score, grade_id")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    if (gErr) return error(gErr.message, 500);
    if (!games?.length) return json({ players: [], summary: { total_close_games: 0, avg_margin: 0, most_clutch_team: null } });

    // 2. Identify close games
    const closeGames = games.filter(
      (g) => Math.abs((g.home_score ?? 0) - (g.away_score ?? 0)) <= CLOSE_GAME_MARGIN
    );

    // Build per-team-per-grade close game stats
    // Map: teamId -> { closeWins, closeLosses, closeGames, gradeIds }
    const teamClutch = new Map<string, { wins: number; losses: number; draws: number; gradeIds: Set<string> }>();

    const addTeam = (id: string | null, won: boolean, drew: boolean, gradeId: string | null) => {
      if (!id) return;
      const entry = teamClutch.get(id) || { wins: 0, losses: 0, draws: 0, gradeIds: new Set<string>() };
      if (drew) entry.draws++;
      else if (won) entry.wins++;
      else entry.losses++;
      if (gradeId) entry.gradeIds.add(gradeId);
      teamClutch.set(id, entry);
    };

    for (const g of closeGames) {
      const hs = g.home_score ?? 0;
      const as = g.away_score ?? 0;
      const drew = hs === as;
      addTeam(g.home_team_id, hs > as, drew, g.grade_id);
      addTeam(g.away_team_id, as > hs, drew, g.grade_id);
    }

    // 3. Fetch player_stats with player names and team info
    const { data: playerStats, error: psErr } = await supabase
      .from("player_stats")
      .select("player_id, grade_id, team_name, games_played, total_points, players!inner(first_name, last_name)");

    if (psErr) return error(psErr.message, 500);

    // 4. Fetch teams to map team names to team IDs
    const { data: teams, error: tErr } = await supabase
      .from("teams")
      .select("id, name");

    if (tErr) return error(tErr.message, 500);

    // Build name->ids map (multiple teams can share a name across grades)
    const teamNameToIds = new Map<string, string[]>();
    for (const t of teams || []) {
      const key = t.name.toLowerCase();
      const arr = teamNameToIds.get(key) || [];
      arr.push(t.id);
      teamNameToIds.set(key, arr);
    }

    // 5. For each player, calculate clutch metrics
    // Group stats by player
    const playerMap = new Map<string, {
      first_name: string;
      last_name: string;
      totalGames: number;
      totalPoints: number;
      closeGamesTeamWins: number;
      closeGamesTeamLosses: number;
      closeGamesCount: number;
      gradeCount: number;
    }>();

    for (const ps of playerStats || []) {
      const player = ps.players as unknown as { first_name: string; last_name: string };
      const existing = playerMap.get(ps.player_id) || {
        first_name: player?.first_name || "",
        last_name: player?.last_name || "",
        totalGames: 0,
        totalPoints: 0,
        closeGamesTeamWins: 0,
        closeGamesTeamLosses: 0,
        closeGamesCount: 0,
        gradeCount: 0,
      };

      existing.totalGames += ps.games_played || 0;
      existing.totalPoints += ps.total_points || 0;
      existing.gradeCount++;

      // Match player's team to close game stats
      if (ps.team_name) {
        const teamIds = teamNameToIds.get(ps.team_name.toLowerCase()) || [];
        for (const tid of teamIds) {
          const tc = teamClutch.get(tid);
          if (tc && tc.gradeIds.has(ps.grade_id)) {
            existing.closeGamesTeamWins += tc.wins;
            existing.closeGamesTeamLosses += tc.losses;
            existing.closeGamesCount += tc.wins + tc.losses + tc.draws;
            break; // matched this grade
          }
        }
      }

      playerMap.set(ps.player_id, existing);
    }

    // 6. Calculate clutch rating and build results
    const results = [];
    for (const [playerId, p] of playerMap) {
      if (p.totalGames < 5 || p.closeGamesCount === 0) continue;

      const overallPPG = p.totalPoints / p.totalGames;
      const closeWinRate = p.closeGamesCount > 0
        ? p.closeGamesTeamWins / p.closeGamesCount
        : 0;

      // Clutch rating: combination of PPG, close-game win rate, and volume
      // Higher PPG + higher close-game win rate + more close games = more clutch
      const volumeBonus = Math.min(p.closeGamesCount / 10, 1.5); // up to 1.5x for volume
      const clutchRating = (overallPPG * 0.4 + closeWinRate * 50 * 0.4 + volumeBonus * 10 * 0.2);

      results.push({
        player_id: playerId,
        first_name: p.first_name,
        last_name: p.last_name,
        clutch_rating: +clutchRating.toFixed(1),
        overall_ppg: +overallPPG.toFixed(1),
        close_game_wins: p.closeGamesTeamWins,
        close_game_losses: p.closeGamesTeamLosses,
        close_games: p.closeGamesCount,
        total_games: p.totalGames,
      });
    }

    results.sort((a, b) => b.clutch_rating - a.clutch_rating);

    // 7. Summary stats
    const avgMargin = closeGames.length > 0
      ? closeGames.reduce((sum, g) => sum + Math.abs((g.home_score ?? 0) - (g.away_score ?? 0)), 0) / closeGames.length
      : 0;

    // Most clutch team: team with best close-game win rate (min 3 close games)
    let mostClutchTeam: { name: string; wins: number; losses: number; rate: number } | null = null;
    for (const [teamId, tc] of teamClutch) {
      const total = tc.wins + tc.losses + tc.draws;
      if (total < 3) continue;
      const rate = tc.wins / total;
      if (!mostClutchTeam || rate > mostClutchTeam.rate) {
        const team = (teams || []).find((t) => t.id === teamId);
        if (team) {
          mostClutchTeam = { name: team.name, wins: tc.wins, losses: tc.losses, rate: +rate.toFixed(3) };
        }
      }
    }

    return json({
      players: results.slice(0, 100),
      summary: {
        total_close_games: closeGames.length,
        avg_margin: +avgMargin.toFixed(1),
        most_clutch_team: mostClutchTeam,
      },
    });
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Internal error", 500);
  }
}
