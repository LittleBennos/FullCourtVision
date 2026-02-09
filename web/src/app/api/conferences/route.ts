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
  const seasonId = params.get("season") || undefined;
  const playoffSize = Math.min(parseInt(params.get("playoff_size") || "4", 10), 16);

  let query = supabase
    .from("team_aggregates")
    .select("team_id, name, organisation_id, organisation_name, season_id, season_name, wins, losses, gp");

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data, error: dbError } = await query.order("organisation_name").order("wins", { ascending: false });

  if (dbError) return error(dbError.message, 500);

  // Group by organisation (conference)
  const confMap = new Map<string, {
    id: string;
    name: string;
    season_id: string;
    season_name: string;
    teams: Array<{
      id: string;
      name: string;
      wins: number;
      losses: number;
      games_played: number;
      win_pct: number;
      seed: number | null;
      playoff: boolean;
    }>;
  }>();

  for (const t of data || []) {
    const key = `${t.organisation_id}_${t.season_id}`;
    if (!confMap.has(key)) {
      confMap.set(key, {
        id: t.organisation_id,
        name: t.organisation_name || "Unknown",
        season_id: t.season_id,
        season_name: t.season_name || "",
        teams: [],
      });
    }
    const gp = t.gp || 0;
    const winPct = gp > 0 ? t.wins / gp : 0;
    confMap.get(key)!.teams.push({
      id: t.team_id,
      name: t.name,
      wins: t.wins || 0,
      losses: t.losses || 0,
      games_played: gp,
      win_pct: Math.round(winPct * 1000) / 1000,
      seed: null,
      playoff: false,
    });
  }

  // Sort teams within each conference and assign seeds
  const conferences = Array.from(confMap.values()).map((conf) => {
    conf.teams.sort((a, b) => b.win_pct - a.win_pct || b.wins - a.wins || a.losses - b.losses);
    conf.teams.forEach((t, i) => {
      t.seed = i + 1;
      t.playoff = i < playoffSize;
    });
    return conf;
  });

  // Sort conferences by name
  conferences.sort((a, b) => a.name.localeCompare(b.name));

  return json({ data: conferences, meta: { playoff_size: playoffSize, total_conferences: conferences.length } });
}
