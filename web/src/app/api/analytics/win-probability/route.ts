import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamStats {
  id: string;
  name: string;
  seasonId: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  offensivePpg: number;
  defensivePpgAllowed: number;
  recentFormWins: number;
  recentFormGames: number;
  threePtPct: number;
  threePtMade: number;
  threePtAttempted: number;
}

async function getTeamStats(teamId: string): Promise<TeamStats | null> {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("id", teamId)
    .single();

  if (!team) return null;

  // Get all games for this team
  const [homeRes, awayRes] = await Promise.all([
    supabase
      .from("games")
      .select("home_score, away_score, date")
      .eq("home_team_id", teamId)
      .not("home_score", "is", null)
      .order("date", { ascending: false }),
    supabase
      .from("games")
      .select("home_score, away_score, date")
      .eq("away_team_id", teamId)
      .not("home_score", "is", null)
      .order("date", { ascending: false }),
  ]);

  // Combine and sort all games by date descending
  const allGames: { scored: number; allowed: number; date: string; won: boolean }[] = [];
  for (const g of homeRes.data || []) {
    allGames.push({
      scored: g.home_score ?? 0,
      allowed: g.away_score ?? 0,
      date: g.date,
      won: (g.home_score ?? 0) > (g.away_score ?? 0),
    });
  }
  for (const g of awayRes.data || []) {
    allGames.push({
      scored: g.away_score ?? 0,
      allowed: g.home_score ?? 0,
      date: g.date,
      won: (g.away_score ?? 0) > (g.home_score ?? 0),
    });
  }
  allGames.sort((a, b) => b.date.localeCompare(a.date));

  const gp = allGames.length;
  const wins = allGames.filter((g) => g.won).length;
  const losses = gp - wins;
  const totalScored = allGames.reduce((s, g) => s + g.scored, 0);
  const totalAllowed = allGames.reduce((s, g) => s + g.allowed, 0);
  const offensivePpg = gp > 0 ? totalScored / gp : 0;
  const defensivePpgAllowed = gp > 0 ? totalAllowed / gp : 0;

  // Recent form: last 5 games
  const recent5 = allGames.slice(0, 5);
  const recentFormWins = recent5.filter((g) => g.won).length;

  // 3PT shooting from player_stats
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .eq("season_id", team.season_id);

  let threePtMade = 0;
  let threePtAttempted = 0;
  if (grades && grades.length > 0) {
    const { data: stats } = await supabase
      .from("player_stats")
      .select("three_point, two_point, one_point, total_points, games_played")
      .eq("team_name", team.name)
      .in("grade_id", grades.map((g: { id: string }) => g.id));

    for (const s of stats || []) {
      threePtMade += s.three_point || 0;
      // Estimate attempts: assume ~33% make rate if we don't have attempts
      // We only have makes, so use made as the metric
    }
    // Use total 3pt made per game as the metric
    const totalGamesFromStats = (stats || []).reduce((s, p) => s + (p.games_played || 0), 0);
    threePtAttempted = totalGamesFromStats; // store total player-games for rate calc
  }

  // 3PT percentage: 3pt made per team-game as a proxy
  const threePtPct = gp > 0 ? threePtMade / gp : 0;

  return {
    id: teamId,
    name: team.name,
    seasonId: team.season_id,
    wins,
    losses,
    gamesPlayed: gp,
    offensivePpg: +offensivePpg.toFixed(1),
    defensivePpgAllowed: +defensivePpgAllowed.toFixed(1),
    recentFormWins,
    recentFormGames: recent5.length,
    threePtPct: +threePtPct.toFixed(1),
    threePtMade,
    threePtAttempted,
  };
}

async function getHeadToHead(team1Id: string, team2Id: string) {
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score, date")
    .or(
      `and(home_team_id.eq.${team1Id},away_team_id.eq.${team2Id}),and(home_team_id.eq.${team2Id},away_team_id.eq.${team1Id})`
    )
    .not("home_score", "is", null)
    .order("date", { ascending: false })
    .limit(20);

  let team1Wins = 0;
  let team2Wins = 0;
  const recentGames: { date: string; team1Score: number; team2Score: number; winner: "team1" | "team2" }[] = [];

  for (const g of games || []) {
    const t1IsHome = g.home_team_id === team1Id;
    const t1Score = t1IsHome ? (g.home_score ?? 0) : (g.away_score ?? 0);
    const t2Score = t1IsHome ? (g.away_score ?? 0) : (g.home_score ?? 0);

    if (t1Score > t2Score) team1Wins++;
    else if (t2Score > t1Score) team2Wins++;

    recentGames.push({
      date: g.date,
      team1Score: t1Score,
      team2Score: t2Score,
      winner: t1Score > t2Score ? "team1" : "team2",
    });
  }

  return { team1Wins, team2Wins, totalGames: (games || []).length, recentGames };
}

function computeWinProbability(
  t1: TeamStats,
  t2: TeamStats,
  h2h: { team1Wins: number; team2Wins: number; totalGames: number }
) {
  // Each factor produces a score from 0-1 for team1
  // Then weighted sum gives overall probability

  // 1. Offensive PPG (30%) — higher is better
  const maxPpg = Math.max(t1.offensivePpg, t2.offensivePpg, 1);
  const offScore1 = t1.offensivePpg / (t1.offensivePpg + t2.offensivePpg || 1);

  // 2. Defensive PPG allowed (25%) — lower is better
  const defScore1 =
    t1.defensivePpgAllowed + t2.defensivePpgAllowed > 0
      ? t2.defensivePpgAllowed / (t1.defensivePpgAllowed + t2.defensivePpgAllowed)
      : 0.5;

  // 3. Head-to-head record (20%)
  const h2hScore1 =
    h2h.totalGames > 0
      ? h2h.team1Wins / h2h.totalGames
      : 0.5; // neutral if no h2h

  // 4. Recent form — last 5 games (15%)
  const t1RecentPct = t1.recentFormGames > 0 ? t1.recentFormWins / t1.recentFormGames : 0.5;
  const t2RecentPct = t2.recentFormGames > 0 ? t2.recentFormWins / t2.recentFormGames : 0.5;
  const formScore1 = (t1RecentPct + t2RecentPct) > 0 ? t1RecentPct / (t1RecentPct + t2RecentPct) : 0.5;

  // 5. 3PT shooting (10%) — higher 3pt per game is better
  const threePtScore1 =
    t1.threePtPct + t2.threePtPct > 0
      ? t1.threePtPct / (t1.threePtPct + t2.threePtPct)
      : 0.5;

  const rawProb =
    offScore1 * 0.3 +
    defScore1 * 0.25 +
    h2hScore1 * 0.2 +
    formScore1 * 0.15 +
    threePtScore1 * 0.1;

  // Clamp between 5-95%
  const team1Pct = Math.max(5, Math.min(95, Math.round(rawProb * 100)));
  const team2Pct = 100 - team1Pct;

  // Confidence level based on sample size
  const minGames = Math.min(t1.gamesPlayed, t2.gamesPlayed);
  const confidence: "low" | "medium" | "high" =
    minGames < 3 ? "low" : minGames < 8 ? "medium" : "high";

  const factors = [
    {
      key: "offensive_ppg",
      label: "Offensive PPG",
      weight: 0.3,
      team1Value: t1.offensivePpg,
      team2Value: t2.offensivePpg,
      team1Score: +(offScore1 * 100).toFixed(1),
      team2Score: +((1 - offScore1) * 100).toFixed(1),
      advantage: offScore1 > 0.5 ? "team1" as const : offScore1 < 0.5 ? "team2" as const : "even" as const,
    },
    {
      key: "defensive_ppg",
      label: "Defensive PPG Allowed",
      weight: 0.25,
      team1Value: t1.defensivePpgAllowed,
      team2Value: t2.defensivePpgAllowed,
      team1Score: +(defScore1 * 100).toFixed(1),
      team2Score: +((1 - defScore1) * 100).toFixed(1),
      advantage: defScore1 > 0.5 ? "team1" as const : defScore1 < 0.5 ? "team2" as const : "even" as const,
    },
    {
      key: "head_to_head",
      label: "Head-to-Head",
      weight: 0.2,
      team1Value: h2h.team1Wins,
      team2Value: h2h.team2Wins,
      team1Score: +(h2hScore1 * 100).toFixed(1),
      team2Score: +((1 - h2hScore1) * 100).toFixed(1),
      advantage: h2hScore1 > 0.5 ? "team1" as const : h2hScore1 < 0.5 ? "team2" as const : "even" as const,
    },
    {
      key: "recent_form",
      label: "Recent Form (Last 5)",
      weight: 0.15,
      team1Value: `${t1.recentFormWins}-${t1.recentFormGames - t1.recentFormWins}`,
      team2Value: `${t2.recentFormWins}-${t2.recentFormGames - t2.recentFormWins}`,
      team1Score: +(formScore1 * 100).toFixed(1),
      team2Score: +((1 - formScore1) * 100).toFixed(1),
      advantage: formScore1 > 0.5 ? "team1" as const : formScore1 < 0.5 ? "team2" as const : "even" as const,
    },
    {
      key: "three_pt",
      label: "3PT Shooting",
      weight: 0.1,
      team1Value: `${t1.threePtPct}/gm`,
      team2Value: `${t2.threePtPct}/gm`,
      team1Score: +(threePtScore1 * 100).toFixed(1),
      team2Score: +((1 - threePtScore1) * 100).toFixed(1),
      advantage: threePtScore1 > 0.5 ? "team1" as const : threePtScore1 < 0.5 ? "team2" as const : "even" as const,
    },
  ];

  return { team1Pct, team2Pct, factors, confidence };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const t1Id = params.get("team1");
  const t2Id = params.get("team2");

  if (!t1Id || !t2Id) return error("Both team1 and team2 IDs are required");
  if (t1Id === t2Id) return error("Cannot compare a team to itself");

  const [t1, t2, h2h] = await Promise.all([
    getTeamStats(t1Id),
    getTeamStats(t2Id),
    getHeadToHead(t1Id, t2Id),
  ]);

  if (!t1) return error("Team 1 not found", 404);
  if (!t2) return error("Team 2 not found", 404);

  const probability = computeWinProbability(t1, t2, h2h);

  return json({
    team1: t1,
    team2: t2,
    headToHead: h2h,
    probability,
  });
}
