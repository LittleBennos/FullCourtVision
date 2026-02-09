import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamData {
  id: string;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  avgPpg: number;
  topPlayers: { name: string; ppg: number; games: number }[];
}

async function getTeamData(teamId: string): Promise<TeamData | null> {
  // Get team aggregate info
  const { data: team } = await supabase
    .from("team_aggregates")
    .select("team_id, name, wins, losses, gp")
    .eq("team_id", teamId)
    .single();

  if (!team) return null;

  // Get player stats for this team
  const { data: players } = await supabase
    .from("player_stats")
    .select("player_id, first_name, last_name, games_played, total_points")
    .eq("team_id", teamId)
    .order("total_points", { ascending: false })
    .limit(20);

  const roster = (players || []).map((p) => {
    const gp = Math.max(p.games_played || 1, 1);
    return {
      name: `${p.first_name} ${p.last_name}`,
      ppg: +(((p.total_points || 0) / gp).toFixed(1)),
      games: p.games_played || 0,
    };
  });

  const totalPoints = roster.reduce((s, p) => s + p.ppg, 0);
  const avgPpg = roster.length > 0 ? +(totalPoints / Math.min(roster.length, 5)).toFixed(1) : 0;

  return {
    id: teamId,
    name: team.name,
    wins: team.wins || 0,
    losses: team.losses || 0,
    gamesPlayed: team.gp || 0,
    avgPpg,
    topPlayers: roster.slice(0, 5),
  };
}

async function getHeadToHead(team1Id: string, team2Id: string) {
  // Games where team1 is home and team2 is away, or vice versa
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score, date")
    .or(
      `and(home_team_id.eq.${team1Id},away_team_id.eq.${team2Id}),and(home_team_id.eq.${team2Id},away_team_id.eq.${team1Id})`
    )
    .order("date", { ascending: false })
    .limit(20);

  let team1Wins = 0;
  let team2Wins = 0;
  const recentGames: { date: string; team1Score: number; team2Score: number; winner: string }[] = [];

  for (const g of games || []) {
    const hs = g.home_score ?? 0;
    const as = g.away_score ?? 0;
    const t1IsHome = g.home_team_id === team1Id;
    const t1Score = t1IsHome ? hs : as;
    const t2Score = t1IsHome ? as : hs;

    if (t1Score > t2Score) team1Wins++;
    else if (t2Score > t1Score) team2Wins++;

    if (recentGames.length < 5) {
      recentGames.push({
        date: g.date,
        team1Score: t1Score,
        team2Score: t2Score,
        winner: t1Score > t2Score ? "team1" : "team2",
      });
    }
  }

  return { team1Wins, team2Wins, totalGames: (games || []).length, recentGames };
}

function computePrediction(
  team1: TeamData,
  team2: TeamData,
  h2h: { team1Wins: number; team2Wins: number; totalGames: number }
) {
  let team1Score = 50;

  // Win-loss record factor (up to 20 pts)
  const t1WinPct = team1.gamesPlayed > 0 ? team1.wins / team1.gamesPlayed : 0.5;
  const t2WinPct = team2.gamesPlayed > 0 ? team2.wins / team2.gamesPlayed : 0.5;
  team1Score += Math.max(-20, Math.min(20, (t1WinPct - t2WinPct) * 40));

  // PPG factor (up to 15 pts)
  const ppgDiff = team1.avgPpg - team2.avgPpg;
  team1Score += Math.max(-15, Math.min(15, ppgDiff * 1.5));

  // Roster depth — sum of top 5 ppg (up to 10 pts)
  const t1Depth = team1.topPlayers.reduce((s, p) => s + p.ppg, 0);
  const t2Depth = team2.topPlayers.reduce((s, p) => s + p.ppg, 0);
  const depthDiff = t1Depth - t2Depth;
  team1Score += Math.max(-10, Math.min(10, depthDiff * 0.3));

  // Head-to-head factor (up to 10 pts)
  if (h2h.totalGames > 0) {
    const h2hPct = h2h.team1Wins / h2h.totalGames - 0.5;
    team1Score += Math.max(-10, Math.min(10, h2hPct * 20));
  }

  team1Score = Math.max(5, Math.min(95, Math.round(team1Score)));

  const factors = [
    {
      label: "Win-Loss Record",
      team1Value: `${team1.wins}-${team1.losses}`,
      team2Value: `${team2.wins}-${team2.losses}`,
      advantage: t1WinPct > t2WinPct ? "team1" as const : t2WinPct > t1WinPct ? "team2" as const : "even" as const,
    },
    {
      label: "Avg PPG (Top 5)",
      team1Value: `${team1.avgPpg}`,
      team2Value: `${team2.avgPpg}`,
      advantage: team1.avgPpg > team2.avgPpg ? "team1" as const : team2.avgPpg > team1.avgPpg ? "team2" as const : "even" as const,
    },
    {
      label: "Roster Depth",
      team1Value: `${t1Depth.toFixed(1)} PPG`,
      team2Value: `${t2Depth.toFixed(1)} PPG`,
      advantage: t1Depth > t2Depth ? "team1" as const : t2Depth > t1Depth ? "team2" as const : "even" as const,
    },
    {
      label: "Head-to-Head",
      team1Value: `${h2h.team1Wins}W`,
      team2Value: `${h2h.team2Wins}W`,
      advantage: h2h.team1Wins > h2h.team2Wins ? "team1" as const : h2h.team2Wins > h2h.team1Wins ? "team2" as const : "even" as const,
    },
  ];

  return { team1WinPct: team1Score, team2WinPct: 100 - team1Score, factors };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const t1 = params.get("team1");
  const t2 = params.get("team2");

  if (!t1 || !t2) return error("Both team1 and team2 IDs are required");
  if (t1 === t2) return error("Cannot compare a team to itself");

  const [team1, team2, h2h] = await Promise.all([
    getTeamData(t1),
    getTeamData(t2),
    getHeadToHead(t1, t2),
  ]);

  if (!team1) return error("Team 1 not found", 404);
  if (!team2) return error("Team 2 not found", 404);

  const prediction = computePrediction(team1, team2, h2h);

  return json({
    team1,
    team2,
    headToHead: h2h,
    prediction,
  });
}
