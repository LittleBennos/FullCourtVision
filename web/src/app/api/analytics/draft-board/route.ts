import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS, parseIntParam } from "../../helpers";

export { OPTIONS };
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Draft Board / Prospect Rankings API
 *
 * Composite Score = PER (40%) + Scoring Trend (20%) + Consistency (20%) + Games Played (20%)
 * All components normalized to 0-100 scale before weighting.
 *
 * Tiers: Elite (top 5%), Star (5-15%), Starter (15-30%), Rotation (30-50%), Bench (50%+)
 *
 * Query params:
 *   season - filter by season id
 *   grade  - filter by grade id
 *   limit  - max results (default 200, max 500)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const seasonId = params.get("season") || "";
  const gradeId = params.get("grade") || "";
  const limit = parseIntParam(params.get("limit"), 200, 500);

  try {
    let query = supabase
      .from("player_stats")
      .select(`
        player_id,
        games_played,
        total_points,
        two_point,
        three_point,
        one_point,
        total_fouls,
        team_name,
        players!inner(first_name, last_name),
        grades!inner(id, name, type, seasons!inner(id, name))
      `)
      .gte("games_played", 3);

    if (seasonId) query = query.eq("grades.seasons.id", seasonId);
    if (gradeId) query = query.eq("grade_id", gradeId);

    const { data: rawStats, error: dbErr } = await query;
    if (dbErr) return error(dbErr.message, 500);

    // Aggregate per player
    const playerMap = new Map<string, {
      id: string;
      first_name: string;
      last_name: string;
      team_name: string;
      grade_name: string;
      grade_id: string;
      games: number;
      points: number;
      twoPt: number;
      threePt: number;
      onePt: number;
      fouls: number;
      // Per-game scores for consistency calc
      gameScores: number[];
    }>();

    for (const r of rawStats || []) {
      const pid = r.player_id;
      const gradeInfo = r.grades as any;
      const playerInfo = r.players as any;
      const ppg = r.games_played > 0 ? (r.total_points || 0) / r.games_played : 0;

      const cur = playerMap.get(pid);
      if (cur) {
        cur.games += r.games_played || 0;
        cur.points += r.total_points || 0;
        cur.twoPt += r.two_point || 0;
        cur.threePt += r.three_point || 0;
        cur.onePt += r.one_point || 0;
        cur.fouls += r.total_fouls || 0;
        cur.gameScores.push(ppg);
      } else {
        playerMap.set(pid, {
          id: pid,
          first_name: playerInfo?.first_name || "",
          last_name: playerInfo?.last_name || "",
          team_name: r.team_name || "",
          grade_name: gradeInfo?.name || "",
          grade_id: gradeInfo?.id || "",
          games: r.games_played || 0,
          points: r.total_points || 0,
          twoPt: r.two_point || 0,
          threePt: r.three_point || 0,
          onePt: r.one_point || 0,
          fouls: r.total_fouls || 0,
          gameScores: [ppg],
        });
      }
    }

    const players = Array.from(playerMap.values()).filter((p) => p.games >= 3);
    if (players.length === 0) {
      return json({ data: [], meta: { total: 0, season: seasonId || "all", grade: gradeId || "all" } });
    }

    // Calculate raw metrics
    const metrics = players.map((p) => {
      const ppg = p.points / p.games;
      const rawPer = (p.points + p.twoPt * 0.5 + p.threePt * 1.0 - p.fouls * 0.8) / p.games;

      // Scoring trend: approximate using 3pt ratio as proxy for modern scoring
      const totalShots = p.onePt + p.twoPt + p.threePt;
      const scoringTrend = totalShots > 0 ? (p.threePt / totalShots) * ppg : ppg * 0.5;

      // Consistency: inverse of stddev of per-entry ppg (lower stddev = more consistent)
      const mean = p.gameScores.reduce((a, b) => a + b, 0) / p.gameScores.length;
      const variance = p.gameScores.length > 1
        ? p.gameScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (p.gameScores.length - 1)
        : 0;
      const stddev = Math.sqrt(variance);

      return { ...p, ppg, rawPer, scoringTrend, stddev };
    });

    // Normalize each metric to 0-100
    const maxPer = Math.max(...metrics.map((m) => m.rawPer), 1);
    const minPer = Math.min(...metrics.map((m) => m.rawPer), 0);
    const maxTrend = Math.max(...metrics.map((m) => m.scoringTrend), 1);
    const maxStddev = Math.max(...metrics.map((m) => m.stddev), 1);
    const maxGames = Math.max(...metrics.map((m) => m.games), 1);

    const normalize = (val: number, min: number, max: number) =>
      max - min > 0 ? ((val - min) / (max - min)) * 100 : 50;

    const scored = metrics.map((m) => {
      const perNorm = normalize(m.rawPer, minPer, maxPer);
      const trendNorm = normalize(m.scoringTrend, 0, maxTrend);
      const consistencyNorm = 100 - normalize(m.stddev, 0, maxStddev); // lower stddev = higher score
      const gamesNorm = normalize(m.games, 0, maxGames);

      const composite = +(
        perNorm * 0.4 +
        trendNorm * 0.2 +
        consistencyNorm * 0.2 +
        gamesNorm * 0.2
      ).toFixed(1);

      // Normalize PER to league avg 15
      const leagueAvgRaw = metrics.reduce((s, x) => s + x.rawPer, 0) / metrics.length || 1;
      const per = +(m.rawPer * (15 / leagueAvgRaw)).toFixed(1);

      return {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        team_name: m.team_name,
        grade_name: m.grade_name,
        grade_id: m.grade_id,
        composite,
        per,
        ppg: +m.ppg.toFixed(1),
        games: m.games,
      };
    });

    // Sort by composite desc and assign rank + tier
    scored.sort((a, b) => b.composite - a.composite);
    const total = scored.length;

    const result = scored.map((p, i) => {
      const percentile = ((i + 1) / total) * 100;
      let tier: string;
      if (percentile <= 5) tier = "Elite";
      else if (percentile <= 15) tier = "Star";
      else if (percentile <= 30) tier = "Starter";
      else if (percentile <= 50) tier = "Rotation";
      else tier = "Bench";

      return { rank: i + 1, ...p, tier };
    });

    return json({
      data: result.slice(0, limit),
      meta: { total, season: seasonId || "all", grade: gradeId || "all" },
    });
  } catch (err: any) {
    console.error("Draft Board API error:", err);
    return error("Failed to calculate draft board", 500);
  }
}
