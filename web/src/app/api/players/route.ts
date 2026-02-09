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
  const org = params.get("org") || "";
  const season = params.get("season") || "";
  const minGames = parseIntParam(params.get("minGames"), 0);
  const sort = params.get("sort") || "total_points";
  const dir = params.get("dir") === "asc" ? true : false;
  const limit = parseIntParam(params.get("limit"), 25, 100);
  const offset = parseIntParam(params.get("offset"), 0);

  // If org or season filters are set, we need to query player_stats with joins
  if (org || season) {
    return getFilteredPlayers({ search, org, season, minGames, sort, ascending: dir, limit, offset });
  }

  // Default: use player_aggregates view
  let query = supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg", { count: "exact" });

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    query = query.in("player_id", idList);
  } else if (search) {
    const words = search.trim().split(/\s+/);
    if (words.length >= 2) {
      const first = words[0];
      const last = words.slice(1).join(" ");
      query = query.ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`);
    } else {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
  }

  if (minGames > 0) {
    query = query.gte("total_games", minGames);
  }

  // Map sort keys
  const validSorts: Record<string, string> = {
    last_name: "last_name",
    total_games: "total_games",
    total_points: "total_points",
    ppg: "ppg",
  };
  const sortCol = validSorts[sort] || "total_points";

  const { data, count, error: dbError } = await query
    .order(sortCol, { ascending: dir })
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

async function getFilteredPlayers(opts: {
  search: string;
  org: string;
  season: string;
  minGames: number;
  sort: string;
  ascending: boolean;
  limit: number;
  offset: number;
}) {
  // Fetch player_stats with grade→season→competition→organisation joins
  let query = supabase
    .from("player_stats")
    .select(`
      player_id, games_played, total_points,
      players!inner(first_name, last_name),
      grades!inner(season_id, seasons!inner(id, name, competitions!inner(organisation_id)))
    `);

  if (opts.org) {
    query = query.eq("grades.seasons.competitions.organisation_id", opts.org);
  }
  if (opts.season) {
    query = query.eq("grades.season_id", opts.season);
  }

  if (opts.search) {
    const words = opts.search.trim().split(/\s+/);
    if (words.length >= 2) {
      query = query.ilike("players.first_name", `%${words[0]}%`).ilike("players.last_name", `%${words.slice(1).join(" ")}%`);
    } else {
      query = query.or(`first_name.ilike.%${opts.search}%,last_name.ilike.%${opts.search}%`, { referencedTable: "players" });
    }
  }

  // Fetch all matching rows (paginated)
  const PAGE = 1000;
  let allStats: any[] = [];
  let from = 0;
  while (true) {
    const { data: batch, error: dbErr } = await query.range(from, from + PAGE - 1);
    if (dbErr) return error(dbErr.message, 500);
    if (!batch || batch.length === 0) break;
    allStats = allStats.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  // Aggregate by player
  const playerMap = new Map<string, {
    id: string; first_name: string; last_name: string;
    total_games: number; total_points: number;
  }>();

  for (const s of allStats) {
    const pid = s.player_id;
    const ex = playerMap.get(pid);
    if (ex) {
      ex.total_games += s.games_played || 0;
      ex.total_points += s.total_points || 0;
    } else {
      playerMap.set(pid, {
        id: pid,
        first_name: (s.players as any)?.first_name || "",
        last_name: (s.players as any)?.last_name || "",
        total_games: s.games_played || 0,
        total_points: s.total_points || 0,
      });
    }
  }

  let players = Array.from(playerMap.values()).map(p => ({
    ...p,
    ppg: p.total_games > 0 ? +(p.total_points / p.total_games).toFixed(1) : 0,
  }));

  if (opts.minGames > 0) {
    players = players.filter(p => p.total_games >= opts.minGames);
  }

  // Sort
  const sortFns: Record<string, (a: any, b: any) => number> = {
    last_name: (a, b) => a.last_name.localeCompare(b.last_name),
    total_games: (a, b) => a.total_games - b.total_games,
    total_points: (a, b) => a.total_points - b.total_points,
    ppg: (a, b) => a.ppg - b.ppg,
  };
  const sortFn = sortFns[opts.sort] || sortFns.total_points;
  players.sort((a, b) => opts.ascending ? sortFn(a, b) : -sortFn(a, b));

  const total = players.length;
  const paged = players.slice(opts.offset, opts.offset + opts.limit);

  return json({
    data: paged,
    meta: { total, limit: opts.limit, offset: opts.offset },
  });
}
