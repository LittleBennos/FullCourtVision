import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Milestone {
  id: string;
  category: "points" | "games" | "scoring" | "threes";
  name: string;
  description: string;
  target: number;
  current: number;
  reached: boolean;
  dateAchieved: string | null;
  icon: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", id)
    .single();

  if (!player) return error("Player not found", 404);

  // Fetch all stats with season info, ordered by season name for chronological approximation
  const { data: stats, error: dbError } = await supabase
    .from("player_stats")
    .select(`
      games_played, total_points, three_point,
      grades!inner(name, seasons!inner(name))
    `)
    .eq("player_id", id);

  if (dbError) return error(dbError.message, 500);

  const rows = (stats || []) as any[];

  // Sort by season name (alphabetical approximation of chronological)
  rows.sort((a, b) => {
    const sA = a.grades?.seasons?.name || "";
    const sB = b.grades?.seasons?.name || "";
    return sA.localeCompare(sB);
  });

  // Build running totals to find when milestones were hit
  let runningGames = 0;
  let runningPoints = 0;
  let runningThrees = 0;

  // Track per-season high game (approximation — we only have totals per grade, so ppg * 1 game estimate)
  const seasonEntries: { season: string; games: number; points: number; threes: number; ppg: number }[] = [];

  for (const row of rows) {
    const g = row.games_played || 0;
    const p = row.total_points || 0;
    const t = row.three_point || 0;
    const ppg = g > 0 ? p / g : 0;
    const season = row.grades?.seasons?.name || "Unknown";
    seasonEntries.push({ season, games: g, points: p, threes: t, ppg });
  }

  // Compute milestones
  const milestones: Milestone[] = [];

  // Points milestones
  const pointTargets = [50, 100, 250, 500, 1000];
  for (const target of pointTargets) {
    let cumulative = 0;
    let achievedSeason: string | null = null;
    for (const entry of seasonEntries) {
      cumulative += entry.points;
      if (cumulative >= target && !achievedSeason) {
        achievedSeason = entry.season;
      }
    }
    const totalPoints = seasonEntries.reduce((s, e) => s + e.points, 0);
    milestones.push({
      id: `pts-${target}`,
      category: "points",
      name: `${target} Career Points`,
      description: `Score ${target} total career points`,
      target,
      current: Math.min(totalPoints, target),
      reached: totalPoints >= target,
      dateAchieved: achievedSeason,
      icon: "target",
    });
  }

  // Games milestones
  const gamesTargets = [10, 25, 50, 100];
  for (const target of gamesTargets) {
    let cumulative = 0;
    let achievedSeason: string | null = null;
    for (const entry of seasonEntries) {
      cumulative += entry.games;
      if (cumulative >= target && !achievedSeason) {
        achievedSeason = entry.season;
      }
    }
    const totalGames = seasonEntries.reduce((s, e) => s + e.games, 0);
    milestones.push({
      id: `games-${target}`,
      category: "games",
      name: `${target} Career Games`,
      description: `Play in ${target} career games`,
      target,
      current: Math.min(totalGames, target),
      reached: totalGames >= target,
      dateAchieved: achievedSeason,
      icon: "users",
    });
  }

  // Scoring milestones (best PPG as proxy for single-game high)
  const scoringTargets = [{ threshold: 20, label: "20+" }, { threshold: 30, label: "30+" }];
  for (const { threshold, label } of scoringTargets) {
    // Use PPG as best estimate since we don't have per-game data
    const bestEntry = seasonEntries.reduce<{ ppg: number; season: string } | null>(
      (best, e) => (e.ppg > (best?.ppg || 0) ? { ppg: e.ppg, season: e.season } : best),
      null
    );
    const bestPpg = bestEntry?.ppg || 0;
    milestones.push({
      id: `scoring-${threshold}`,
      category: "scoring",
      name: `First ${label} Point Game`,
      description: `Average ${label} points in a competition (per-game estimate)`,
      target: threshold,
      current: Math.min(Math.round(bestPpg * 10) / 10, threshold),
      reached: bestPpg >= threshold,
      dateAchieved: bestPpg >= threshold ? (bestEntry?.season || null) : null,
      icon: "flame",
    });
  }

  // Three-point milestones
  const threesTargets = [10, 25, 50, 100];
  for (const target of threesTargets) {
    let cumulative = 0;
    let achievedSeason: string | null = null;
    for (const entry of seasonEntries) {
      cumulative += entry.threes;
      if (cumulative >= target && !achievedSeason) {
        achievedSeason = entry.season;
      }
    }
    const totalThrees = seasonEntries.reduce((s, e) => s + e.threes, 0);
    milestones.push({
      id: `threes-${target}`,
      category: "threes",
      name: `${target} Career Threes`,
      description: `Make ${target} career three-pointers`,
      target,
      current: Math.min(totalThrees, target),
      reached: totalThrees >= target,
      dateAchieved: achievedSeason,
      icon: "zap",
    });
  }

  // Sort: reached first (by category order), then upcoming
  const reached = milestones.filter((m) => m.reached);
  const upcoming = milestones.filter((m) => !m.reached).sort((a, b) => (b.current / b.target) - (a.current / a.target));

  return json({ data: { reached, upcoming } });
}
