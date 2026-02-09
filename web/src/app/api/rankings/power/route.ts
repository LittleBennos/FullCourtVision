import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cache for 5 minutes
let cache: { key: string; data: unknown; ts: number } | null = null;
const CACHE_TTL = 300_000;

async function fetchAll(table: string, select: string, filters?: Record<string, unknown>) {
  const rows: unknown[] = [];
  const pageSize = 1000;
  let offset = 0;
  let done = false;
  while (!done) {
    let q = supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        q = q.eq(k, v);
      }
    }
    const { data, error: err } = await q;
    if (err) throw new Error(`${table}: ${err.message}`);
    if (!data || data.length === 0) { done = true; break; }
    rows.push(...data);
    if (data.length < pageSize) done = true;
    offset += pageSize;
  }
  return rows;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const seasonId = params.get("season") || undefined;
  const cacheKey = `power_${seasonId || "all"}`;

  if (cache && cache.key === cacheKey && Date.now() - cache.ts < CACHE_TTL) {
    return json(cache.data);
  }

  try {
    // 1. Fetch all team aggregates
    const teamFilters: Record<string, unknown> = {};
    if (seasonId) teamFilters.season_id = seasonId;
    const teams = (await fetchAll("team_aggregates", "team_id,name,organisation_id,organisation_name,season_id,season_name,wins,losses,gp", teamFilters)) as any[];

    if (teams.length === 0) return json({ data: [], seasons: [] });

    // Collect unique seasons
    const seasonMap = new Map<string, string>();
    for (const t of teams) {
      if (t.season_id && t.season_name) seasonMap.set(t.season_id, t.season_name);
    }
    const seasons = [...seasonMap.entries()].map(([id, name]) => ({ id, name }));

    // Filter teams with at least 3 games played
    const validTeams = teams.filter((t: any) => t.gp >= 3);

    // 2. Fetch finished games for point differential
    const gameFilters: Record<string, unknown> = { status: "FINAL" };
    const games = (await fetchAll("games", "home_team_id,away_team_id,home_score,away_score", gameFilters)) as any[];

    // Build point differential map: team_id -> { totalDiff, gamesCount }
    const diffMap = new Map<string, { totalDiff: number; count: number }>();
    for (const g of games) {
      const hDiff = (g.home_score ?? 0) - (g.away_score ?? 0);
      // Home team
      const h = diffMap.get(g.home_team_id) || { totalDiff: 0, count: 0 };
      h.totalDiff += hDiff;
      h.count += 1;
      diffMap.set(g.home_team_id, h);
      // Away team
      const a = diffMap.get(g.away_team_id) || { totalDiff: 0, count: 0 };
      a.totalDiff -= hDiff;
      a.count += 1;
      diffMap.set(g.away_team_id, a);
    }

    // 3. Fetch player stats for top-5 PPG and bench scoring
    const playerStats = (await fetchAll("player_stats", "team_name,games_played,total_points")) as any[];

    // Build per-team player PPG lists (keyed by team_name since no team_id in player_stats)
    const teamPlayerPPG = new Map<string, number[]>();
    for (const ps of playerStats) {
      if (!ps.team_name || !ps.games_played || ps.games_played < 1) continue;
      const ppg = ps.total_points / ps.games_played;
      const arr = teamPlayerPPG.get(ps.team_name) || [];
      arr.push(ppg);
      teamPlayerPPG.set(ps.team_name, arr);
    }

    // Sort each team's player list descending
    for (const [k, arr] of teamPlayerPPG) {
      arr.sort((a, b) => b - a);
    }

    // 4. Compute power ratings
    // Normalize components to 0-100 scale
    const teamData = validTeams.map((t: any) => {
      const winPct = t.gp > 0 ? t.wins / t.gp : 0;
      const diff = diffMap.get(t.team_id);
      const avgDiff = diff && diff.count > 0 ? diff.totalDiff / diff.count : 0;
      const players = teamPlayerPPG.get(t.name) || [];
      const top5Avg = players.length > 0
        ? players.slice(0, 5).reduce((s, v) => s + v, 0) / Math.min(players.length, 5)
        : 0;
      // Bench = players 6+ avg PPG contribution
      const benchPlayers = players.slice(5);
      const benchAvg = benchPlayers.length > 0
        ? benchPlayers.reduce((s, v) => s + v, 0) / benchPlayers.length
        : 0;
      const rosterSize = players.length;

      return {
        team_id: t.team_id,
        name: t.name,
        organisation_name: t.organisation_name || "",
        season_id: t.season_id,
        season_name: t.season_name || "",
        wins: t.wins,
        losses: t.losses,
        gp: t.gp,
        winPct,
        avgDiff,
        top5Avg,
        benchAvg,
        rosterSize,
      };
    });

    // Find min/max for normalization
    const maxDiff = Math.max(...teamData.map((t) => t.avgDiff), 1);
    const minDiff = Math.min(...teamData.map((t) => t.avgDiff), -1);
    const maxTop5 = Math.max(...teamData.map((t) => t.top5Avg), 1);
    const maxBench = Math.max(...teamData.map((t) => t.benchAvg), 0.1);

    const ranked = teamData.map((t) => {
      // Normalize each component to 0-100
      const winScore = t.winPct * 100;
      const diffScore = maxDiff !== minDiff
        ? ((t.avgDiff - minDiff) / (maxDiff - minDiff)) * 100
        : 50;
      const top5Score = (t.top5Avg / maxTop5) * 100;
      const benchScore = (t.benchAvg / maxBench) * 100;

      const powerRating =
        winScore * 0.4 +
        diffScore * 0.25 +
        top5Score * 0.2 +
        benchScore * 0.15;

      return {
        team_id: t.team_id,
        name: t.name,
        organisation_name: t.organisation_name,
        season_id: t.season_id,
        season_name: t.season_name,
        wins: t.wins,
        losses: t.losses,
        gp: t.gp,
        power_rating: Math.round(powerRating * 10) / 10,
        breakdown: {
          win_pct: Math.round(winScore * 10) / 10,
          point_diff: Math.round(diffScore * 10) / 10,
          top5_scoring: Math.round(top5Score * 10) / 10,
          bench_depth: Math.round(benchScore * 10) / 10,
        },
        avg_point_diff: Math.round(t.avgDiff * 10) / 10,
        roster_size: t.rosterSize,
      };
    });

    // Sort by power rating descending
    ranked.sort((a, b) => b.power_rating - a.power_rating);

    // Add rank
    const result = ranked.map((t, i) => ({ rank: i + 1, ...t }));

    const response = { data: result, seasons, meta: { total: result.length } };
    cache = { key: cacheKey, data: response, ts: Date.now() };
    return json(response);
  } catch (e: any) {
    return error(e.message || "Failed to compute rankings", 500);
  }
}
