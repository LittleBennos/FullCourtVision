import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS, parseIntParam } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const limit = parseIntParam(req.nextUrl.searchParams.get("limit"), 5, 20);

  if (q.length < 2) return error("Query must be at least 2 characters");

  const [playersRes, teamsRes, orgsRes] = await Promise.all([
    supabase
      .from("player_aggregates")
      .select("player_id, first_name, last_name, total_games, ppg")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .order("total_points", { ascending: false })
      .limit(limit),
    supabase
      .from("teams")
      .select("id, name, organisations(name)")
      .ilike("name", `%${q}%`)
      .limit(limit),
    supabase
      .from("organisations")
      .select("id, name, suburb, state")
      .ilike("name", `%${q}%`)
      .limit(limit),
  ]);

  return json({
    data: {
      players: (playersRes.data || []).map((p: any) => ({
        id: p.player_id,
        name: `${p.first_name} ${p.last_name}`,
        total_games: p.total_games,
        ppg: +p.ppg,
      })),
      teams: (teamsRes.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        organisation: (t.organisations as any)?.name || "",
      })),
      organisations: (orgsRes.data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        location: o.suburb && o.state ? `${o.suburb}, ${o.state}` : "",
      })),
    },
  });
}
