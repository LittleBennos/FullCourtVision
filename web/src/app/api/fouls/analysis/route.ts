import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch player_stats with fouls (min 5 games)
    const PAGE = 1000;
    let allStats: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("player_stats")
        .select("player_id, team_name, games_played, total_points, total_fouls, one_point, two_point, three_point")
        .gte("games_played", 5)
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      allStats = allStats.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Collect unique player_ids for name lookup
    const playerIds = [...new Set(allStats.map((s) => s.player_id))];

    // Batch fetch names from player_aggregates
    const nameMap: Record<string, { first_name: string; last_name: string }> = {};
    for (let i = 0; i < playerIds.length; i += 500) {
      const batch = playerIds.slice(i, i + 500);
      const { data } = await supabase
        .from("player_aggregates")
        .select("player_id, first_name, last_name")
        .in("player_id", batch);
      if (data) {
        for (const p of data) {
          nameMap[p.player_id] = { first_name: p.first_name, last_name: p.last_name };
        }
      }
    }

    // Compute per-player aggregated stats (across all their entries)
    const playerMap: Record<string, { games: number; fouls: number; points: number; team: string }> = {};
    for (const s of allStats) {
      const pid = s.player_id;
      if (!playerMap[pid]) {
        playerMap[pid] = { games: 0, fouls: 0, points: 0, team: s.team_name };
      }
      playerMap[pid].games += s.games_played || 0;
      playerMap[pid].fouls += s.total_fouls || 0;
      playerMap[pid].points += s.total_points || 0;
    }

    const players = Object.entries(playerMap).map(([pid, p]) => {
      const name = nameMap[pid];
      return {
        player_id: pid,
        name: name ? `${name.first_name} ${name.last_name}` : "Unknown",
        team: p.team,
        games: p.games,
        fouls: p.fouls,
        points: p.points,
        fpg: +(p.fouls / p.games).toFixed(2),
        ppg: +(p.points / p.games).toFixed(1),
      };
    });

    // Foul-out leaders (highest fpg)
    const foulLeaders = [...players].sort((a, b) => b.fpg - a.fpg).slice(0, 50);

    // Most disciplined (lowest fpg with meaningful games)
    const disciplined = [...players]
      .filter((p) => p.games >= 10 && p.points > 0)
      .sort((a, b) => a.fpg - b.fpg)
      .slice(0, 50);

    // Scatter data: fouls vs PPG (sample up to 500)
    const scatterData = players
      .filter((p) => p.games >= 5)
      .slice(0, 500)
      .map((p) => ({ fpg: p.fpg, ppg: p.ppg, name: p.name, player_id: p.player_id }));

    // Foul rate histogram
    const histBuckets: Record<string, number> = {
      "0-1": 0, "1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0, "5+": 0,
    };
    for (const p of players) {
      if (p.fpg < 1) histBuckets["0-1"]++;
      else if (p.fpg < 2) histBuckets["1-2"]++;
      else if (p.fpg < 3) histBuckets["2-3"]++;
      else if (p.fpg < 4) histBuckets["3-4"]++;
      else if (p.fpg < 5) histBuckets["4-5"]++;
      else histBuckets["5+"]++;
    }

    const histogram = Object.entries(histBuckets).map(([range, count]) => ({ range, count }));

    // Summary stats
    const totalPlayers = players.length;
    const avgFpg = totalPlayers > 0
      ? +(players.reduce((s, p) => s + p.fpg, 0) / totalPlayers).toFixed(2)
      : 0;

    return NextResponse.json({
      foulLeaders,
      disciplined,
      scatterData,
      histogram,
      summary: { totalPlayers, avgFpg },
    });
  } catch (error) {
    console.error("Fouls analysis API error:", error);
    return NextResponse.json({ error: "Failed to fetch foul analysis" }, { status: 500 });
  }
}
