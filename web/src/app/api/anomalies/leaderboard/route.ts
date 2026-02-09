import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS, parseIntParam } from "../../helpers";
import { detectAnomalies, type Anomaly, type AnomalyType } from "@/lib/anomalies";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface LeaderboardEntry {
  player_id: string;
  first_name: string;
  last_name: string;
  anomalies: Anomaly[];
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const limit = parseIntParam(url.searchParams.get("limit"), 50, 200);
  const typeFilter = url.searchParams.get("type") as AnomalyType | null;
  const minGames = parseIntParam(url.searchParams.get("min_games"), 10, 1000);

  // Get players with enough games
  const { data: aggregates, error: aggErr } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg")
    .gte("total_games", minGames)
    .order("total_games", { ascending: false })
    .limit(500);

  if (aggErr) return error(aggErr.message, 500);
  if (!aggregates || aggregates.length === 0) return json({ data: [] });

  const playerIds = aggregates.map((a) => a.player_id);

  // Fetch all stats for these players
  const { data: allStats, error: statsErr } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(name, type, seasons!inner(name, competitions!inner(name)))
    `)
    .in("player_id", playerIds);

  if (statsErr) return error(statsErr.message, 500);

  // Group stats by player
  const statsByPlayer = new Map<string, typeof allStats>();
  for (const stat of allStats || []) {
    const existing = statsByPlayer.get(stat.player_id) || [];
    existing.push(stat);
    statsByPlayer.set(stat.player_id, existing);
  }

  // Detect anomalies for each player
  const results: LeaderboardEntry[] = [];
  for (const agg of aggregates) {
    const playerStats = statsByPlayer.get(agg.player_id) || [];
    const anomalies = detectAnomalies(playerStats as any, {
      id: agg.player_id,
      first_name: agg.first_name,
      last_name: agg.last_name,
    });

    if (anomalies.length === 0) continue;

    const filtered = typeFilter
      ? anomalies.filter((a) => a.type === typeFilter)
      : anomalies;

    if (filtered.length > 0) {
      results.push({
        player_id: agg.player_id,
        first_name: agg.first_name,
        last_name: agg.last_name,
        anomalies: filtered,
      });
    }
  }

  // Sort by number of anomalies (descending), then by severity
  const severityOrder = { legendary: 3, rare: 2, notable: 1 };
  results.sort((a, b) => {
    const aMax = Math.max(...a.anomalies.map((x) => severityOrder[x.severity]));
    const bMax = Math.max(...b.anomalies.map((x) => severityOrder[x.severity]));
    if (bMax !== aMax) return bMax - aMax;
    return b.anomalies.length - a.anomalies.length;
  });

  return json({ data: results.slice(0, limit) });
}
