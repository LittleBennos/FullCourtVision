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
  const org = params.get("org") || "";
  const limit = parseIntParam(params.get("limit"), 25, 100);
  const offset = parseIntParam(params.get("offset"), 0);

  let query = supabase
    .from("team_aggregates")
    .select("team_id, name, organisation_id, season_id, organisation_name, season_name, wins, losses, gp", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (org) {
    query = query.eq("organisation_id", org);
  }

  const { data, count, error: dbError } = await query
    .order("name")
    .range(offset, offset + limit - 1);

  if (dbError) return error(dbError.message, 500);

  return json({
    data: (data || []).map((t: any) => ({
      id: t.team_id,
      name: t.name,
      organisation_id: t.organisation_id,
      organisation_name: t.organisation_name || "",
      season_id: t.season_id,
      season_name: t.season_name || "",
      wins: t.wins,
      losses: t.losses,
      games_played: t.gp,
    })),
    meta: { total: count || 0, limit, offset },
  });
}
