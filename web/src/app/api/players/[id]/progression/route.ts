import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seasonFilter = req.nextUrl.searchParams.get("season");

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", id)
    .single();

  if (!player) return error("Player not found", 404);

  // Get all player_stats with grade -> season -> competition info
  let query = supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(id, name, type, seasons!inner(id, name, start_date, end_date, competitions!inner(id, name)))
    `)
    .eq("player_id", id)
    .gt("games_played", 0);

  if (seasonFilter) {
    query = query.eq("grades.season_id", seasonFilter);
  }

  const { data: stats, error: dbError } = await query;

  if (dbError) return error(dbError.message, 500);

  // Map and sort by season start_date for chronological ordering
  const entries = (stats || [])
    .map((s: any) => {
      const gp = s.games_played || 0;
      const ppg = gp > 0 ? +(s.total_points / gp).toFixed(1) : 0;
      const twoPtPg = gp > 0 ? +(s.two_point / gp).toFixed(1) : 0;
      const threePtPg = gp > 0 ? +(s.three_point / gp).toFixed(1) : 0;
      const foulsPg = gp > 0 ? +(s.total_fouls / gp).toFixed(1) : 0;

      return {
        id: s.id,
        grade_id: s.grade_id,
        team_name: s.team_name,
        games_played: gp,
        total_points: s.total_points,
        ppg,
        twoPtPg,
        threePtPg,
        foulsPg,
        grade_name: s.grades?.name,
        grade_type: s.grades?.type,
        season_id: s.grades?.seasons?.id,
        season_name: s.grades?.seasons?.name,
        season_start: s.grades?.seasons?.start_date,
        competition_name: s.grades?.seasons?.competitions?.name,
      };
    })
    .sort((a: any, b: any) => {
      const dateA = a.season_start ? new Date(a.season_start).getTime() : 0;
      const dateB = b.season_start ? new Date(b.season_start).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.competition_name || "").localeCompare(b.competition_name || "");
    });

  // Calculate moving average (window of 3)
  const windowSize = Math.min(3, entries.length);
  const withTrend = entries.map((entry: any, i: number) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = entries.slice(start, i + 1);
    const movingAvg = +(window.reduce((sum: number, e: any) => sum + e.ppg, 0) / window.length).toFixed(1);
    return { ...entry, movingAvg };
  });

  // Find peak and valley
  let peakIdx = 0;
  let valleyIdx = 0;
  for (let i = 0; i < withTrend.length; i++) {
    if (withTrend[i].ppg > withTrend[peakIdx].ppg) peakIdx = i;
    if (withTrend[i].ppg < withTrend[valleyIdx].ppg) valleyIdx = i;
  }

  const annotated = withTrend.map((entry: any, i: number) => ({
    ...entry,
    isPeak: i === peakIdx && withTrend.length > 1,
    isValley: i === valleyIdx && withTrend.length > 1 && peakIdx !== valleyIdx,
  }));

  // Get distinct seasons for the dropdown
  const seasonSet = new Map<string, string>();
  for (const e of entries) {
    if (e.season_id && e.season_name) {
      seasonSet.set(e.season_id, e.season_name);
    }
  }
  const seasons = Array.from(seasonSet.entries()).map(([id, name]) => ({ id, name }));

  return json({ data: annotated, seasons });
}
