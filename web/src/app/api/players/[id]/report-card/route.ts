import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function computeArchetype(ppg: number, threePtPg: number, twoPtPg: number, foulsPg: number): string {
  if (ppg >= 15) return "High Volume";
  if (threePtPg >= 2 && threePtPg > twoPtPg * 0.6) return "Sharpshooter";
  if (foulsPg >= 3 || (foulsPg >= 2 && ppg < 8)) return "Physical";
  if (twoPtPg >= 3 && twoPtPg > threePtPg * 2) return "Inside Scorer";
  return "Balanced";
}

function computeGrade(composite: number): string {
  if (composite >= 90) return "A+";
  if (composite >= 80) return "A";
  if (composite >= 70) return "B+";
  if (composite >= 60) return "B";
  if (composite >= 50) return "C+";
  if (composite >= 40) return "C";
  if (composite >= 30) return "D";
  return "F";
}

function percentileRank(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / values.length) * 100);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch player
  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", id)
    .single();

  if (playerErr || !player) return error("Player not found", 404);

  // Fetch all stats for this player with grade/season info
  const { data: stats, error: statsErr } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(id, name, type, seasons!inner(id, name, start_date, competitions!inner(name)))
    `)
    .eq("player_id", id);

  if (statsErr) return error(statsErr.message, 500);
  if (!stats || stats.length === 0) return error("No stats found for player", 404);

  // Map and sort chronologically
  const mapped = (stats as any[])
    .filter((s) => s.games_played > 0)
    .map((s) => {
      const gp = s.games_played || 0;
      return {
        id: s.id,
        grade_id: s.grade_id,
        grade_name: s.grades?.name,
        grade_type: s.grades?.type,
        season_id: s.grades?.seasons?.id,
        season_name: s.grades?.seasons?.name,
        season_start: s.grades?.seasons?.start_date,
        competition_name: s.grades?.seasons?.competitions?.name,
        team_name: s.team_name,
        games_played: gp,
        total_points: s.total_points || 0,
        two_point: s.two_point || 0,
        three_point: s.three_point || 0,
        total_fouls: s.total_fouls || 0,
        ppg: gp > 0 ? +(s.total_points / gp).toFixed(1) : 0,
        twoPtPg: gp > 0 ? +(s.two_point / gp).toFixed(1) : 0,
        threePtPg: gp > 0 ? +(s.three_point / gp).toFixed(1) : 0,
        foulsPg: gp > 0 ? +(s.total_fouls / gp).toFixed(1) : 0,
        ranking: s.ranking,
      };
    })
    .sort((a, b) => {
      const da = a.season_start ? new Date(a.season_start).getTime() : 0;
      const db = b.season_start ? new Date(b.season_start).getTime() : 0;
      return da - db;
    });

  if (mapped.length === 0) return error("No stats with games played", 404);

  // Career totals
  const totalGames = mapped.reduce((s, e) => s + e.games_played, 0);
  const totalPoints = mapped.reduce((s, e) => s + e.total_points, 0);
  const totalTwos = mapped.reduce((s, e) => s + e.two_point, 0);
  const totalThrees = mapped.reduce((s, e) => s + e.three_point, 0);
  const totalFouls = mapped.reduce((s, e) => s + e.total_fouls, 0);

  const careerPpg = +(totalPoints / totalGames).toFixed(1);
  const careerTwoPtPg = +(totalTwos / totalGames).toFixed(1);
  const careerThreePtPg = +(totalThrees / totalGames).toFixed(1);
  const careerFoulsPg = +(totalFouls / totalGames).toFixed(1);

  // Archetype per season entry + current
  const archetypeHistory = mapped.map((e) => ({
    season: e.season_name || e.competition_name || "Unknown",
    archetype: computeArchetype(e.ppg, e.threePtPg, e.twoPtPg, e.foulsPg),
  }));
  const currentArchetype = computeArchetype(careerPpg, careerThreePtPg, careerTwoPtPg, careerFoulsPg);

  // PPG growth season-over-season
  const ppgGrowth = mapped.length >= 2
    ? +(mapped[mapped.length - 1].ppg - mapped[mapped.length - 2].ppg).toFixed(1)
    : 0;

  // Percentile rankings - fetch all player_stats in the same grades
  const gradeIds = [...new Set(mapped.map((m) => m.grade_id))];
  const { data: peerStats } = await supabase
    .from("player_stats")
    .select("player_id, grade_id, games_played, total_points, two_point, three_point, total_fouls")
    .in("grade_id", gradeIds)
    .gt("games_played", 0);

  // Aggregate peers by player (across matching grades)
  const peerMap = new Map<string, { gp: number; pts: number; twos: number; threes: number; fouls: number }>();
  for (const ps of peerStats || []) {
    const existing = peerMap.get(ps.player_id) || { gp: 0, pts: 0, twos: 0, threes: 0, fouls: 0 };
    existing.gp += ps.games_played || 0;
    existing.pts += ps.total_points || 0;
    existing.twos += ps.two_point || 0;
    existing.threes += ps.three_point || 0;
    existing.fouls += ps.total_fouls || 0;
    peerMap.set(ps.player_id, existing);
  }

  const peerPpgs: number[] = [];
  const peerThreePgs: number[] = [];
  const peerGames: number[] = [];
  const peerFoulPgs: number[] = [];

  for (const [, p] of peerMap) {
    if (p.gp > 0) {
      peerPpgs.push(+(p.pts / p.gp).toFixed(1));
      peerThreePgs.push(+(p.threes / p.gp).toFixed(1));
      peerGames.push(p.gp);
      peerFoulPgs.push(+(p.fouls / p.gp).toFixed(1));
    }
  }

  const percentiles = {
    scoring: percentileRank(careerPpg, peerPpgs),
    threePoint: percentileRank(careerThreePtPg, peerThreePgs),
    experience: percentileRank(totalGames, peerGames),
    discipline: percentileRank(-careerFoulsPg, peerFoulPgs.map((f) => -f)), // lower fouls = better
  };

  // Efficiency: points per foul (higher = better)
  const efficiency = careerFoulsPg > 0 ? +(careerPpg / careerFoulsPg).toFixed(1) : careerPpg;
  const peerEfficiencies = Array.from(peerMap.values())
    .filter((p) => p.gp > 0)
    .map((p) => {
      const fpg = p.fouls / p.gp;
      const ppg = p.pts / p.gp;
      return fpg > 0 ? +(ppg / fpg).toFixed(1) : ppg;
    });
  percentiles.scoring; // already set
  const efficiencyPercentile = percentileRank(efficiency, peerEfficiencies);

  // Strengths/weaknesses for radar chart
  const radarCategories = [
    { label: "Scoring", value: percentiles.scoring },
    { label: "Efficiency", value: efficiencyPercentile },
    { label: "3PT Shooting", value: percentiles.threePoint },
    { label: "Experience", value: percentiles.experience },
    { label: "Discipline", value: percentiles.discipline },
  ];

  const strengths = radarCategories.filter((c) => c.value >= 65).map((c) => c.label);
  const weaknesses = radarCategories.filter((c) => c.value < 35).map((c) => c.label);

  // Composite score (weighted average of percentiles)
  const composite = Math.round(
    percentiles.scoring * 0.3 +
    efficiencyPercentile * 0.2 +
    percentiles.threePoint * 0.15 +
    percentiles.experience * 0.2 +
    percentiles.discipline * 0.15
  );

  const overallGrade = computeGrade(composite);

  // Season progression data for line chart
  const seasonProgression = mapped.map((e) => ({
    label: `${e.competition_name || ""} ${e.season_name || ""}`.trim() || "Unknown",
    ppg: e.ppg,
    twoPtPg: e.twoPtPg,
    threePtPg: e.threePtPg,
    foulsPg: e.foulsPg,
    gamesPlayed: e.games_played,
  }));

  return json({
    data: {
      player: {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
      },
      currentArchetype,
      archetypeHistory,
      careerStats: {
        totalGames,
        totalPoints,
        ppg: careerPpg,
        twoPtPg: careerTwoPtPg,
        threePtPg: careerThreePtPg,
        foulsPg: careerFoulsPg,
      },
      ppgGrowth,
      percentiles: {
        scoring: percentiles.scoring,
        efficiency: efficiencyPercentile,
        threePoint: percentiles.threePoint,
        experience: percentiles.experience,
        discipline: percentiles.discipline,
      },
      radarData: radarCategories,
      strengths,
      weaknesses,
      composite,
      overallGrade,
      seasonProgression,
    },
  });
}
