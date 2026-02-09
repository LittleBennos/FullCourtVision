import { createClient } from "@supabase/supabase-js";
import { json, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Fetch all player_stats
  const PAGE_SIZE = 1000;
  let allStats: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("player_stats")
      .select("player_id, grade_id, team_name, games_played")
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allStats = allStats.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Build team max games per grade+team
  const teamMaxGames: Record<string, number> = {};
  for (const s of allStats) {
    const key = `${s.grade_id}|${s.team_name}`;
    teamMaxGames[key] = Math.max(teamMaxGames[key] || 0, s.games_played || 0);
  }

  // Aggregate per player
  const playerMap: Record<string, { total_games: number; total_possible: number; longest_streak: number }> = {};
  for (const s of allStats) {
    const gp = s.games_played || 0;
    const key = `${s.grade_id}|${s.team_name}`;
    const teamTotal = teamMaxGames[key] || gp;
    if (!playerMap[s.player_id]) {
      playerMap[s.player_id] = { total_games: 0, total_possible: 0, longest_streak: 0 };
    }
    playerMap[s.player_id].total_games += gp;
    playerMap[s.player_id].total_possible += teamTotal;
    playerMap[s.player_id].longest_streak = Math.max(playerMap[s.player_id].longest_streak, gp);
  }

  // Fetch player names
  const playerIds = Object.keys(playerMap);
  const nameMap: Record<string, { first_name: string; last_name: string }> = {};
  for (let i = 0; i < playerIds.length; i += 500) {
    const batch = playerIds.slice(i, i + 500);
    const { data: players } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", batch);
    for (const p of players || []) {
      nameMap[p.id] = { first_name: p.first_name || "", last_name: p.last_name || "" };
    }
  }

  // Build rows (min 5 games)
  const rows: any[] = [];
  for (const [pid, d] of Object.entries(playerMap)) {
    if (d.total_games < 5 || !nameMap[pid]) continue;
    rows.push({
      player_id: pid,
      first_name: nameMap[pid].first_name,
      last_name: nameMap[pid].last_name,
      total_games: d.total_games,
      total_possible: d.total_possible,
      availability_pct: d.total_possible > 0 ? Math.round((d.total_games / d.total_possible) * 100) : 0,
      longest_streak: d.longest_streak,
      games_missed: d.total_possible - d.total_games,
    });
  }

  const mostAvailable = [...rows]
    .sort((a, b) => b.availability_pct - a.availability_pct || b.total_games - a.total_games)
    .slice(0, 50);

  const ironMan = [...rows]
    .sort((a, b) => b.longest_streak - a.longest_streak || b.total_games - a.total_games)
    .slice(0, 50);

  const mostMissed = [...rows]
    .sort((a, b) => b.games_missed - a.games_missed)
    .slice(0, 50);

  return json({ data: { mostAvailable, ironMan, mostMissed } });
}
