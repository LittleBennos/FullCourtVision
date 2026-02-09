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
  const search = params.get("search") || "";
  const grade = params.get("grade") || "";
  const team = params.get("team") || "";

  try {
    let query = supabase
      .from("player_stats")
      .select(`
        player_id,
        team_name,
        games_played,
        total_points,
        two_point,
        three_point,
        players!inner(first_name, last_name),
        grades!inner(name)
      `)
      .gte("games_played", 3);

    if (grade) {
      query = query.ilike("grades.name", `%${grade}%`);
    }
    if (team) {
      query = query.ilike("team_name", `%${team}%`);
    }

    const { data, error: dbErr } = await query;
    if (dbErr) return error(dbErr.message, 500);

    // Aggregate by player
    const playerMap = new Map<string, {
      id: string;
      first_name: string;
      last_name: string;
      team: string;
      grade: string;
      games: number;
      points: number;
      twoPt: number;
      threePt: number;
    }>();

    for (const r of data || []) {
      const pid = r.player_id;
      const player = r.players as any;
      const gradeInfo = r.grades as any;
      const existing = playerMap.get(pid);
      if (existing) {
        existing.games += r.games_played || 0;
        existing.points += r.total_points || 0;
        existing.twoPt += r.two_point || 0;
        existing.threePt += r.three_point || 0;
      } else {
        playerMap.set(pid, {
          id: pid,
          first_name: player?.first_name || "",
          last_name: player?.last_name || "",
          team: r.team_name || "",
          grade: gradeInfo?.name || "",
          games: r.games_played || 0,
          points: r.total_points || 0,
          twoPt: r.two_point || 0,
          threePt: r.three_point || 0,
        });
      }
    }

    let players = Array.from(playerMap.values()).map((p) => {
      const ppg = +(p.points / p.games).toFixed(1);
      const twoPtPG = +(p.twoPt / p.games).toFixed(1);
      const threePtPG = +(p.threePt / p.games).toFixed(1);
      // Fantasy score: 1pt per point, 0.5 bonus per 3PT made
      const fantasyPPG = +(ppg + threePtPG * 0.5).toFixed(1);

      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        team: p.team,
        grade: p.grade,
        games: p.games,
        ppg,
        twoPtPG,
        threePtPG,
        fantasyPPG,
      };
    });

    // Client-side name search filter
    if (search) {
      const s = search.toLowerCase();
      players = players.filter((p) => p.name.toLowerCase().includes(s));
    }

    players.sort((a, b) => b.fantasyPPG - a.fantasyPPG);

    return json({ players: players.slice(0, 200) });
  } catch (e: unknown) {
    return error(e instanceof Error ? e.message : "Internal error", 500);
  }
}
