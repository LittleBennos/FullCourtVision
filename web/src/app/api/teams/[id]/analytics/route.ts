import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Get team info
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("id", id)
    .single();

  if (teamErr || !team) return error("Team not found", 404);

  // 2. Get team's grade(s)
  const { data: grades } = await supabase
    .from("grades")
    .select("id, name")
    .eq("season_id", team.season_id);

  const gradeIds = (grades || []).map((g: any) => g.id);

  // 3. Fetch games (home + away), player_stats in parallel
  const [homeRes, awayRes, statsRes] = await Promise.all([
    supabase
      .from("games")
      .select("id, date, time, round_name, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score, grade_id, venue")
      .eq("home_team_id", id)
      .not("home_score", "is", null)
      .order("date", { ascending: true }),
    supabase
      .from("games")
      .select("id, date, time, round_name, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score, grade_id, venue")
      .eq("away_team_id", id)
      .not("home_score", "is", null)
      .order("date", { ascending: true }),
    gradeIds.length > 0
      ? supabase
          .from("player_stats")
          .select("player_id, games_played, total_points, one_point, two_point, three_point, total_fouls, players!inner(first_name, last_name)")
          .eq("team_name", team.name)
          .in("grade_id", gradeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const allGames = [...(homeRes.data || []), ...(awayRes.data || [])]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

  // 4. Calculate metrics
  let wins = 0, losses = 0, totalFor = 0, totalAgainst = 0;
  const formResults: { date: string; result: "W" | "L"; teamScore: number; oppScore: number; opponent: string; cumulativeWins: number; cumulativeLosses: number }[] = [];
  
  // H2H tracking
  const h2h: Record<string, { name: string; wins: number; losses: number; pointsFor: number; pointsAgainst: number }> = {};
  
  // Win streak tracking
  let currentStreak = 0;
  let currentStreakType: "W" | "L" | null = null;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  for (const g of allGames) {
    const isHome = g.home_team_id === id;
    const teamScore = isHome ? g.home_score : g.away_score;
    const oppScore = isHome ? g.away_score : g.home_score;
    const oppName = isHome ? g.away_team_name : g.home_team_name;
    const oppId = isHome ? g.away_team_id : g.home_team_id;
    const result: "W" | "L" = teamScore > oppScore ? "W" : "L";

    totalFor += teamScore;
    totalAgainst += oppScore;

    if (result === "W") {
      wins++;
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
    } else {
      losses++;
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
    }

    if (result === currentStreakType) {
      currentStreak++;
    } else {
      currentStreakType = result;
      currentStreak = 1;
    }

    formResults.push({
      date: g.date,
      result,
      teamScore,
      oppScore,
      opponent: oppName || "Unknown",
      cumulativeWins: wins,
      cumulativeLosses: losses,
    });

    // H2H
    if (oppId) {
      if (!h2h[oppId]) h2h[oppId] = { name: oppName || "Unknown", wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
      h2h[oppId].pointsFor += teamScore;
      h2h[oppId].pointsAgainst += oppScore;
      if (result === "W") h2h[oppId].wins++;
      else h2h[oppId].losses++;
    }
  }

  const gamesPlayed = allGames.length;
  const offensiveEfficiency = gamesPlayed > 0 ? +(totalFor / gamesPlayed).toFixed(1) : 0;
  const defensiveEfficiency = gamesPlayed > 0 ? +(totalAgainst / gamesPlayed).toFixed(1) : 0;
  const pace = gamesPlayed > 0 ? +((totalFor + totalAgainst) / gamesPlayed).toFixed(1) : 0;
  const last5 = formResults.slice(-5).map((r) => r.result);
  const winPct = gamesPlayed > 0 ? +((wins / gamesPlayed) * 100).toFixed(1) : 0;

  // Player stats aggregation
  const pm = new Map<string, any>();
  for (const s of (statsRes.data || []) as any[]) {
    const p = pm.get(s.player_id);
    if (p) {
      p.games_played += s.games_played || 0;
      p.total_points += s.total_points || 0;
      p.one_point += s.one_point || 0;
      p.two_point += s.two_point || 0;
      p.three_point += s.three_point || 0;
      p.total_fouls += s.total_fouls || 0;
    } else {
      pm.set(s.player_id, {
        id: s.player_id,
        name: `${s.players?.first_name || ""} ${s.players?.last_name || ""}`.trim(),
        games_played: s.games_played || 0,
        total_points: s.total_points || 0,
        one_point: s.one_point || 0,
        two_point: s.two_point || 0,
        three_point: s.three_point || 0,
        total_fouls: s.total_fouls || 0,
      });
    }
  }

  const topScorers = Array.from(pm.values())
    .map((p) => ({ ...p, ppg: p.games_played > 0 ? +(p.total_points / p.games_played).toFixed(1) : 0 }))
    .sort((a, b) => b.ppg - a.ppg)
    .slice(0, 5);

  // H2H matrix
  const h2hMatrix = Object.entries(h2h)
    .map(([oppId, data]) => ({
      opponentId: oppId,
      opponentName: data.name,
      wins: data.wins,
      losses: data.losses,
      pointsFor: data.pointsFor,
      pointsAgainst: data.pointsAgainst,
      differential: data.pointsFor - data.pointsAgainst,
    }))
    .sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));

  return json({
    data: {
      team: {
        id: team.id,
        name: team.name,
        organisationName: (team.organisations as any)?.name || "",
        seasonName: (team.seasons as any)?.name || "",
      },
      summary: {
        gamesPlayed,
        wins,
        losses,
        winPct,
        offensiveEfficiency,
        defensiveEfficiency,
        pace,
        pointDifferential: +(totalFor - totalAgainst).toFixed(0),
        longestWinStreak,
        longestLossStreak,
        currentStreak: currentStreakType ? `${currentStreak}${currentStreakType}` : "-",
        last5,
      },
      formOverTime: formResults,
      h2hMatrix,
      topScorers,
    },
  });
}
