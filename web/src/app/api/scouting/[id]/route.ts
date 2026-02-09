import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PlayerStatRow {
  id: string;
  player_id: string;
  grade_id: string;
  team_name: string;
  games_played: number;
  total_points: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  ranking: number | null;
  grades: {
    name: string;
    type: string | null;
    seasons: { name: string; competitions: { name: string } };
  };
}

function calcPerGame(total: number, games: number) {
  return games > 0 ? +(total / games).toFixed(2) : 0;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch player
  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select("id, first_name, last_name, updated_at")
    .eq("id", id)
    .single();

  if (playerErr || !player) return error("Player not found", 404);

  // Fetch player's stats with grade info
  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(name, type, seasons!inner(name, competitions!inner(name)))
    `)
    .eq("player_id", id);

  if (!stats || stats.length === 0) {
    return json({ data: { player, stats: [], percentiles: {}, strengths: [], weaknesses: [], comparables: [], seasonTrends: [], overallGrade: "N/A" } });
  }

  const mappedStats = (stats as any[]).map((s) => ({
    id: s.id,
    player_id: s.player_id,
    grade_id: s.grade_id,
    team_name: s.team_name,
    games_played: s.games_played || 0,
    total_points: s.total_points || 0,
    two_point: s.two_point || 0,
    three_point: s.three_point || 0,
    total_fouls: s.total_fouls || 0,
    grade_name: s.grades?.name,
    season_name: s.grades?.seasons?.name,
    competition_name: s.grades?.seasons?.competitions?.name,
  }));

  // Aggregate this player's totals
  const totals = mappedStats.reduce(
    (a, s) => ({
      games: a.games + s.games_played,
      points: a.points + s.total_points,
      twoPt: a.twoPt + s.two_point,
      threePt: a.threePt + s.three_point,
      fouls: a.fouls + s.total_fouls,
    }),
    { games: 0, points: 0, twoPt: 0, threePt: 0, fouls: 0 }
  );

  const playerAvgs = {
    ppg: calcPerGame(totals.points, totals.games),
    twoPtPg: calcPerGame(totals.twoPt, totals.games),
    threePtPg: calcPerGame(totals.threePt, totals.games),
    fpg: calcPerGame(totals.fouls, totals.games),
  };

  // Get all grade_ids this player has played in
  const gradeIds = [...new Set(mappedStats.map(s => s.grade_id))];

  // Fetch all players in those grades for percentile calculation
  const { data: gradeStats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points, two_point, three_point, total_fouls")
    .in("grade_id", gradeIds)
    .gte("games_played", 2);

  // Aggregate per-player across matching grades
  const playerMap = new Map<string, { games: number; points: number; twoPt: number; threePt: number; fouls: number }>();
  for (const s of gradeStats || []) {
    const pid = s.player_id;
    const existing = playerMap.get(pid) || { games: 0, points: 0, twoPt: 0, threePt: 0, fouls: 0 };
    existing.games += s.games_played || 0;
    existing.points += s.total_points || 0;
    existing.twoPt += s.two_point || 0;
    existing.threePt += s.three_point || 0;
    existing.fouls += s.total_fouls || 0;
    playerMap.set(pid, existing);
  }

  // Calculate per-game averages for all players
  const allPlayerAvgs = Array.from(playerMap.entries())
    .filter(([, v]) => v.games >= 2)
    .map(([pid, v]) => ({
      player_id: pid,
      ppg: calcPerGame(v.points, v.games),
      twoPtPg: calcPerGame(v.twoPt, v.games),
      threePtPg: calcPerGame(v.threePt, v.games),
      fpg: calcPerGame(v.fouls, v.games),
      games: v.games,
    }));

  // Calculate percentiles (lower fpg is better, so invert)
  function percentile(arr: number[], val: number) {
    const below = arr.filter(v => v < val).length;
    return Math.round((below / arr.length) * 100);
  }

  const ppgArr = allPlayerAvgs.map(p => p.ppg);
  const twoPtArr = allPlayerAvgs.map(p => p.twoPtPg);
  const threePtArr = allPlayerAvgs.map(p => p.threePtPg);
  const fpgArr = allPlayerAvgs.map(p => p.fpg);

  const percentiles = {
    ppg: percentile(ppgArr, playerAvgs.ppg),
    twoPtPg: percentile(twoPtArr, playerAvgs.twoPtPg),
    threePtPg: percentile(threePtArr, playerAvgs.threePtPg),
    fpg: 100 - percentile(fpgArr, playerAvgs.fpg), // Invert: fewer fouls = better
  };

  // Strengths (>= 75th percentile) and weaknesses (<= 25th)
  const statLabels: Record<string, string> = {
    ppg: "Scoring (PPG)",
    twoPtPg: "Inside Scoring (2PT/G)",
    threePtPg: "Outside Shooting (3PT/G)",
    fpg: "Discipline (Fouls/G)",
  };

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [key, pct] of Object.entries(percentiles)) {
    if (pct >= 75) strengths.push(statLabels[key]);
    if (pct <= 25) weaknesses.push(statLabels[key]);
  }

  // Find 3 most similar players by Euclidean distance on normalized stats
  const statKeys = ["ppg", "twoPtPg", "threePtPg", "fpg"] as const;
  const mins: Record<string, number> = {};
  const maxs: Record<string, number> = {};
  for (const k of statKeys) {
    const vals = allPlayerAvgs.map(p => p[k]);
    mins[k] = Math.min(...vals);
    maxs[k] = Math.max(...vals);
  }

  function normalize(val: number, key: string) {
    const range = maxs[key] - mins[key];
    return range > 0 ? (val - mins[key]) / range : 0;
  }

  const playerNorm = statKeys.map(k => normalize(playerAvgs[k], k));

  const distances = allPlayerAvgs
    .filter(p => p.player_id !== id)
    .map(p => {
      const norm = statKeys.map(k => normalize(p[k], k));
      const dist = Math.sqrt(norm.reduce((sum, v, i) => sum + (v - playerNorm[i]) ** 2, 0));
      return { ...p, distance: dist };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  // Fetch names for comparable players
  let comparables: any[] = [];
  if (distances.length > 0) {
    const { data: compPlayers } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", distances.map(d => d.player_id));

    comparables = distances.map(d => {
      const p = (compPlayers || []).find((cp: any) => cp.id === d.player_id);
      return {
        id: d.player_id,
        first_name: p?.first_name || "Unknown",
        last_name: p?.last_name || "",
        ppg: d.ppg,
        twoPtPg: d.twoPtPg,
        threePtPg: d.threePtPg,
        fpg: d.fpg,
        similarity: Math.round((1 - d.distance / 2) * 100),
      };
    });
  }

  // Season trends (per-season averages for sparkline)
  const seasonMap = new Map<string, { games: number; points: number; season: string }>();
  for (const s of mappedStats) {
    const key = s.season_name || "Unknown";
    const existing = seasonMap.get(key) || { games: 0, points: 0, season: key };
    existing.games += s.games_played;
    existing.points += s.total_points;
    seasonMap.set(key, existing);
  }
  const seasonTrends = Array.from(seasonMap.values()).map(s => ({
    season: s.season,
    ppg: calcPerGame(s.points, s.games),
    games: s.games,
  }));

  // Overall grade (composite of percentiles)
  const composite = (percentiles.ppg + percentiles.twoPtPg + percentiles.threePtPg + percentiles.fpg) / 4;
  let overallGrade: string;
  if (composite >= 90) overallGrade = "A+";
  else if (composite >= 80) overallGrade = "A";
  else if (composite >= 70) overallGrade = "B+";
  else if (composite >= 60) overallGrade = "B";
  else if (composite >= 50) overallGrade = "C+";
  else if (composite >= 40) overallGrade = "C";
  else if (composite >= 30) overallGrade = "D";
  else overallGrade = "F";

  // Get team name and grade from most recent stat
  const latestStat = mappedStats[mappedStats.length - 1];

  return json({
    data: {
      player: {
        ...player,
        team_name: latestStat?.team_name || "Unknown",
        grade_name: latestStat?.grade_name || "Unknown",
      },
      averages: playerAvgs,
      totalGames: totals.games,
      percentiles,
      strengths,
      weaknesses,
      comparables,
      seasonTrends,
      overallGrade,
      composite: Math.round(composite),
      stats: mappedStats,
    },
  });
}
