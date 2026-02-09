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
  const grade = params.get("grade") || "";

  // No season → return seasons list
  if (!season) {
    const { data, error: dbErr } = await supabase
      .from("seasons")
      .select("id, name")
      .order("name", { ascending: false });
    if (dbErr) return error(dbErr.message, 500);
    return json({ seasons: data || [] });
  }

  // Season but no grade → return grades for that season
  if (!grade) {
    const { data, error: dbErr } = await supabase
      .from("grades")
      .select("id, name")
      .eq("season_id", season)
      .order("name");
    if (dbErr) return error(dbErr.message, 500);
    return json({ grades: data || [] });
  }

  // Both season + grade → return players in that grade
  const { data, error: dbErr } = await supabase
    .from("player_stats")
    .select(`
      player_id,
      games_played,
      total_points,
      three_point,
      players!inner(first_name, last_name),
      grades!inner(id, season_id, name)
    `)
    .eq("grades.season_id", season)
    .eq("grades.id", grade);

  if (dbErr) return error(dbErr.message, 500);

  const playerMap = new Map<string, {
    id: string;
    name: string;
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
        name: `${(r.players as any)?.first_name || ""} ${(r.players as any)?.last_name || ""}`.trim(),
        grade: (r.grades as any)?.name || "",
        games: r.games_played || 0,
        points: r.total_points || 0,
        threes: r.three_point || 0,
      });
    }
  }

  const players = Array.from(playerMap.values())
    .filter(p => p.games >= 2)
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
        name: p.name,
        grade: p.grade,
        games: p.games,
        points: p.points,
        ppg,
        threes: p.threes,
        threesPerGame,
        archetype,
      };
    })
    .sort((a, b) => b.ppg - a.ppg);

  return json({ players });
}
