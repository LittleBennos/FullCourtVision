import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS, parseIntParam } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const limit = parseIntParam(params.get("limit"), 25, 100);
  const offset = parseIntParam(params.get("offset"), 0);

  const { data, count, error: dbError } = await supabase
    .from("games")
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      venue,
      date,
      time,
      home_team:teams!home_team_id(id, name),
      away_team:teams!away_team_id(id, name),
      round:rounds(id, name, grade:grades(id, name, season:seasons(id, name)))
    `, { count: "exact" })
    .order("date", { ascending: false })
    .order("time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) return error(dbError.message, 500);

  return json({
    data: (data || []).map((game: any) => ({
      id: game.id,
      home_team: {
        id: game.home_team?.id,
        name: game.home_team?.name
      },
      away_team: {
        id: game.away_team?.id,
        name: game.away_team?.name
      },
      home_score: game.home_score,
      away_score: game.away_score,
      venue: game.venue,
      date: game.date,
      time: game.time,
      round: {
        id: game.round?.id,
        name: game.round?.name,
        grade: {
          id: game.round?.grade?.id,
          name: game.round?.grade?.name,
          season: {
            id: game.round?.grade?.season?.id,
            name: game.round?.grade?.season?.name
          }
        }
      }
    })),
    meta: { total: count || 0, limit, offset },
  });
}