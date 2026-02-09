import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const season = params.get("season") || "";
  const limit = Math.min(parseInt(params.get("limit") || "60", 10) || 60, 100);

  // If no season, return available seasons
  if (!season) {
    const { data, error: dbErr } = await supabase
      .from("seasons")
      .select("id, name")
      .order("name", { ascending: false });

    if (dbErr) return error(dbErr.message, 500);
    return json({ seasons: data || [] });
  }

  // Fetch top players for the given season
  const { data, error: dbErr } = await supabase
    .from("player_stats")
    .select(`
      player_id,
      games_played,
      total_points,
      three_point,
      players!inner(first_name, last_name),
      grades!inner(season_id, name)
    `)
    .eq("grades.season_id", season);

  if (dbErr) return error(dbErr.message, 500);

  // Aggregate by player
  const playerMap = new Map<string, {
    id: string;
    first_name: string;
    last_name: string;
    grade: string;
    games: number;
    points: number;
    threes: number;
  }>();

  for (const r of data || []) {
    const pid = r.player_id;
    const existing = playerMap.get(pid);
    if (existing) {
      existing.games += r.games_played || 0;
      existing.points += r.total_points || 0;
      existing.threes += r.three_point || 0;
    } else {
      playerMap.set(pid, {
        id: pid,
        first_name: (r.players as any)?.first_name || "",
        last_name: (r.players as any)?.last_name || "",
        grade: (r.grades as any)?.name || "",
        games: r.games_played || 0,
        points: r.total_points || 0,
        threes: r.three_point || 0,
      });
    }
  }

  // Calculate stats and assign archetypes
  let players = Array.from(playerMap.values())
    .filter(p => p.games >= 3)
    .map(p => {
      const ppg = +(p.points / p.games).toFixed(1);
      const threesPerGame = +(p.threes / p.games).toFixed(1);
      let archetype = "Balanced";
      if (ppg >= 20) archetype = "Scorer";
      else if (threesPerGame >= 2) archetype = "Sharpshooter";
      else if (ppg >= 12) archetype = "Two-Way";
      else if (p.games >= 10 && ppg >= 5) archetype = "Iron Man";

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        grade: p.grade,
        games: p.games,
        points: p.points,
        ppg,
        threes: p.threes,
        threesPerGame,
        archetype,
      };
    })
    .sort((a, b) => b.ppg - a.ppg)
    .slice(0, limit);

  return json({ players });
}
