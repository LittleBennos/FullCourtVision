import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = Math.max(0, parseInt(params.get("page") || "0"));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "25")));
  const search = params.get("search") || "";
  const sortBy = params.get("sortBy") || "total_points";
  const sortDir = params.get("sortDir") === "asc" ? true : false;

  const validSorts = ["last_name", "first_name", "total_games", "total_points", "ppg"];
  const sortCol = validSorts.includes(sortBy) ? sortBy : "total_points";

  let query = supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg", { count: "exact" });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  query = query
    .order(sortCol, { ascending: sortDir })
    .range(page * perPage, (page + 1) * perPage - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    players: (data || []).map((p: any) => ({
      id: p.player_id,
      first_name: p.first_name,
      last_name: p.last_name,
      total_games: p.total_games,
      total_points: p.total_points,
      ppg: +p.ppg,
    })),
    total: count || 0,
  });
}
