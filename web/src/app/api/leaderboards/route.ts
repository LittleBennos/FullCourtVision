import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS, parseIntParam } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_STATS = ["ppg", "points", "games", "threes"] as const;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const stat = (params.get("stat") || "ppg") as (typeof VALID_STATS)[number];
  const season = params.get("season") || "";
  const limit = parseIntParam(params.get("limit"), 25, 100);

  if (!VALID_STATS.includes(stat)) {
    return error(`Invalid stat. Must be one of: ${VALID_STATS.join(", ")}`);
  }

  let rows: any[];

  if (season) {
    // Filter by season — aggregate from player_stats
    const { data, error: dbErr } = await supabase
      .from("player_stats")
      .select("player_id, players!inner(first_name, last_name), games_played, total_points, three_point, grades!inner(season_id)")
      .eq("grades.season_id", season);

    if (dbErr) return error(dbErr.message, 500);

    const pm = new Map<string, any>();
    for (const r of data || []) {
      const p = pm.get(r.player_id);
      if (p) {
        p.games += r.games_played || 0;
        p.points += r.total_points || 0;
        p.threes += r.three_point || 0;
      } else {
        pm.set(r.player_id, {
          id: r.player_id,
          first_name: (r.players as any)?.first_name || "",
          last_name: (r.players as any)?.last_name || "",
          games: r.games_played || 0,
          points: r.total_points || 0,
          threes: r.three_point || 0,
        });
      }
    }
    rows = Array.from(pm.values())
      .filter((p) => p.games >= 5)
      .map((p) => ({ ...p, ppg: p.games > 0 ? +(p.points / p.games).toFixed(1) : 0 }));
  } else {
    const { data, error: dbErr } = await supabase
      .from("player_aggregates")
      .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg");

    if (dbErr) return error(dbErr.message, 500);

    rows = (data || [])
      .filter((r: any) => r.total_games >= 10)
      .map((r: any) => ({
        id: r.player_id,
        first_name: r.first_name,
        last_name: r.last_name,
        games: r.total_games,
        points: r.total_points,
        threes: r.total_threes,
        ppg: +r.ppg,
      }));
  }

  const sortKey = stat === "ppg" ? "ppg" : stat === "points" ? "points" : stat === "games" ? "games" : "threes";
  rows.sort((a, b) => b[sortKey] - a[sortKey]);

  return json({
    data: rows.slice(0, limit).map((r, i) => ({
      rank: i + 1,
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      games_played: r.games,
      total_points: r.points,
      total_threes: r.threes,
      ppg: r.ppg,
    })),
    meta: { stat, season: season || "all", limit },
  });
}
