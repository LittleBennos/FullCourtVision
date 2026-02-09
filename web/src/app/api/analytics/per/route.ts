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
 * PER (Player Efficiency Rating) Calculator
 *
 * Raw PER = (PTS + 2PT_MADE*0.5 + 3PT_MADE*1.0 - FOULS*0.8) / GP
 * Normalized so league average = 15:
 *   PER = (rawPER / leagueAvgRawPER) * 15
 *
 * Query params:
 *   season  – filter by season id
 *   grade   – filter by grade id
 *   limit   – max results (default 100)
 *   player  – single player id (returns just that player's PER + context)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const seasonId = params.get("season") || "";
  const gradeId = params.get("grade") || "";
  const playerId = params.get("player") || "";
  const limit = parseIntParam(params.get("limit"), 100, 500);

  try {
    // Build query
    let query = supabase
      .from("player_stats")
      .select(`
        player_id,
        games_played,
        total_points,
        two_point,
        three_point,
        total_fouls,
        team_name,
        players!inner(first_name, last_name),
        grades!inner(id, name, type, seasons!inner(id, name))
      `)
      .gte("games_played", 3);

    if (seasonId) {
      query = query.eq("grades.seasons.id", seasonId);
    }
    if (gradeId) {
      query = query.eq("grade_id", gradeId);
    }

    const { data: rawStats, error: dbErr } = await query;
    if (dbErr) return error(dbErr.message, 500);

    // Aggregate per player (across multiple grade entries)
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
      fouls: number;
    }>();

    for (const r of rawStats || []) {
      const pid = r.player_id;
      const cur = playerMap.get(pid);
      const gradeInfo = r.grades as any;
      const playerInfo = r.players as any;

      if (cur) {
        cur.games += r.games_played || 0;
        cur.points += r.total_points || 0;
        cur.twoPt += r.two_point || 0;
        cur.threePt += r.three_point || 0;
        cur.fouls += r.total_fouls || 0;
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
          fouls: r.total_fouls || 0,
        });
      }
    }

    // Calculate raw PER for each player
    const players = Array.from(playerMap.values())
      .filter((p) => p.games >= 3)
      .map((p) => {
        const rawPer = (p.points + p.twoPt * 0.5 + p.threePt * 1.0 - p.fouls * 0.8) / p.games;
        return { ...p, rawPer, ppg: +(p.points / p.games).toFixed(1) };
      });

    // Calculate league average raw PER
    const totalRawPer = players.reduce((sum, p) => sum + p.rawPer, 0);
    const leagueAvgRaw = players.length > 0 ? totalRawPer / players.length : 1;

    // Normalize: PER = (rawPER / leagueAvgRawPER) * 15
    const normFactor = leagueAvgRaw !== 0 ? 15 / leagueAvgRaw : 1;

    const rated = players
      .map((p) => ({
        ...p,
        per: +(p.rawPer * normFactor).toFixed(1),
      }))
      .sort((a, b) => b.per - a.per);

    // Assign rank & percentile
    const total = rated.length;
    const result = rated.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      team_name: p.team_name,
      grade_name: p.grade_name,
      grade_id: p.grade_id,
      per: p.per,
      games: p.games,
      ppg: p.ppg,
      percentile: total > 1 ? +((1 - i / (total - 1)) * 100).toFixed(0) : 100,
    }));

    // If single player requested, return just their data + rank context
    if (playerId) {
      const playerEntry = result.find((p) => p.id === playerId);
      if (!playerEntry) {
        return json({ player: null, total });
      }
      // Grade rank (among same grade)
      const gradeRanked = result.filter((p) => p.grade_id === playerEntry.grade_id);
      const gradeRank = gradeRanked.findIndex((p) => p.id === playerId) + 1;

      return json({
        player: {
          ...playerEntry,
          grade_rank: gradeRank,
          grade_total: gradeRanked.length,
        },
        total,
      });
    }

    return json({
      data: result.slice(0, limit),
      meta: {
        total,
        season: seasonId || "all",
        grade: gradeId || "all",
        league_avg_per: 15,
      },
    });
  } catch (err: any) {
    console.error("PER API error:", err);
    return error("Failed to calculate PER", 500);
  }
}
