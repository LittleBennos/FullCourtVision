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
  const search = params.get("search") || "";
  const ids = params.get("ids");
  const limit = parseIntParam(params.get("limit"), 25, 100);
  const offset = parseIntParam(params.get("offset"), 0);

  let query = supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg", { count: "exact" });

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    query = query.in("player_id", idList);
  } else if (search) {
    const words = search.trim().split(/\s+/);
    if (words.length >= 2) {
      // Multi-word: first word matches first_name, last word matches last_name
      const first = words[0];
      const last = words.slice(1).join(" ");
      query = query.ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`);
    } else {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
  }

  const { data, count, error: dbError } = await query
    .order("total_points", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dbError) return error(dbError.message, 500);

  return json({
    data: (data || []).map((p: any) => ({
      id: p.player_id,
      first_name: p.first_name,
      last_name: p.last_name,
      total_games: p.total_games,
      total_points: p.total_points,
      ppg: +p.ppg,
    })),
    meta: { total: count || 0, limit, offset },
  });
}
