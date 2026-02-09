import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Target season names for the timeline
const TARGET_SEASONS = ["Summer 2025/26", "Winter 2025", "Summer 2024/25"];

export async function GET(_req: NextRequest) {
  try {
    // 1. Get all season IDs for target seasons
    const { data: seasons, error: sErr } = await supabase
      .from("seasons")
      .select("id, name")
      .in("name", TARGET_SEASONS);

    if (sErr) return error(sErr.message, 500);
    if (!seasons || seasons.length === 0) return json({ seasons: [] });

    const seasonsByName: Record<string, string[]> = {};
    for (const s of seasons) {
      if (!seasonsByName[s.name]) seasonsByName[s.name] = [];
      seasonsByName[s.name].push(s.id);
    }

    const allSeasonIds = seasons.map((s) => s.id);

    // 2. Get grades for these seasons
    const { data: grades } = await supabase
      .from("grades")
      .select("id, season_id, name")
      .in("season_id", allSeasonIds);

    const gradeIds = (grades || []).map((g) => g.id);
    const gradeSeasonMap: Record<string, string> = {};
    for (const g of grades || []) {
      gradeSeasonMap[g.id] = g.season_id;
    }

    // 3. Highest-scoring games per season
    const { data: allGames } = await supabase
      .from("games")
      .select(`
        id, home_score, away_score, date, venue,
        home_team:teams!home_team_id(id, name),
        away_team:teams!away_team_id(id, name),
        grade_id
      `)
      .in("grade_id", gradeIds)
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .order("date", { ascending: true });

    // 4. Top scorers (highest PPG, min 5 games)
    const { data: topScorers } = await supabase
      .from("player_stats")
      .select(`
        id, player_id, grade_id, team_name, games_played, total_points,
        player:players!player_id(id, first_name, last_name)
      `)
      .in("grade_id", gradeIds)
      .gte("games_played", 5)
      .order("total_points", { ascending: false })
      .limit(500);

    // 5. Team aggregates for upset detection
    const { data: teamAggs } = await supabase
      .from("team_aggregates")
      .select("team_id, name, season_id, wins, losses, gp")
      .in("season_id", allSeasonIds);

    const teamRecordMap: Record<string, { wins: number; losses: number; gp: number; name: string }> = {};
    for (const ta of teamAggs || []) {
      teamRecordMap[ta.team_id] = { wins: ta.wins, losses: ta.losses, gp: ta.gp, name: ta.name };
    }

    // Build timeline events per season
    const result = TARGET_SEASONS.map((seasonName) => {
      const sIds = seasonsByName[seasonName] || [];
      const seasonGradeIds = (grades || [])
        .filter((g) => sIds.includes(g.season_id))
        .map((g) => g.id);

      // Filter games for this season
      const seasonGames = (allGames || []).filter((g: any) =>
        seasonGradeIds.includes(g.grade_id)
      );

      // Highest scoring games (top 3 by combined score)
      const highScoring = [...seasonGames]
        .map((g: any) => ({
          ...g,
          combined: (g.home_score || 0) + (g.away_score || 0),
        }))
        .sort((a: any, b: any) => b.combined - a.combined)
        .slice(0, 3)
        .map((g: any) => ({
          type: "high_score" as const,
          date: g.date,
          title: `${(g.home_team as any)?.name || "Home"} ${g.home_score} - ${g.away_score} ${(g.away_team as any)?.name || "Away"}`,
          description: `${g.combined} combined points at ${g.venue || "Unknown venue"}`,
          link: `/games/${g.id}`,
          score: g.combined,
        }));

      // Biggest upsets (worst record beating best record)
      const upsets = seasonGames
        .filter((g: any) => {
          const homeRec = teamRecordMap[(g.home_team as any)?.id];
          const awayRec = teamRecordMap[(g.away_team as any)?.id];
          if (!homeRec || !awayRec || homeRec.gp < 3 || awayRec.gp < 3) return false;
          const homeWinPct = homeRec.wins / homeRec.gp;
          const awayWinPct = awayRec.wins / awayRec.gp;
          // Upset: lower win% team won
          const homeWon = (g.home_score || 0) > (g.away_score || 0);
          return (homeWon && homeWinPct < awayWinPct - 0.2) ||
                 (!homeWon && awayWinPct < homeWinPct - 0.2);
        })
        .map((g: any) => {
          const homeRec = teamRecordMap[(g.home_team as any)?.id];
          const awayRec = teamRecordMap[(g.away_team as any)?.id];
          const homeWon = (g.home_score || 0) > (g.away_score || 0);
          const winnerPct = homeWon
            ? (homeRec.wins / homeRec.gp)
            : (awayRec.wins / awayRec.gp);
          const loserPct = homeWon
            ? (awayRec.wins / awayRec.gp)
            : (homeRec.wins / homeRec.gp);
          const upsetMagnitude = loserPct - winnerPct;
          return {
            type: "upset" as const,
            date: g.date,
            title: `${(g.home_team as any)?.name || "Home"} ${g.home_score} - ${g.away_score} ${(g.away_team as any)?.name || "Away"}`,
            description: `Upset! ${Math.round(upsetMagnitude * 100)}% win rate difference`,
            link: `/games/${g.id}`,
            score: upsetMagnitude,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Top scorers for this season (milestone performers)
      const seasonTopScorers = (topScorers || [])
        .filter((ps: any) => seasonGradeIds.includes(ps.grade_id))
        .map((ps: any) => ({
          ...ps,
          ppg: ps.games_played > 0 ? ps.total_points / ps.games_played : 0,
        }))
        .sort((a: any, b: any) => b.ppg - a.ppg)
        .slice(0, 5)
        .map((ps: any) => ({
          type: "milestone" as const,
          date: null,
          title: `${(ps.player as any)?.first_name || ""} ${(ps.player as any)?.last_name || ""} — ${ps.ppg.toFixed(1)} PPG`,
          description: `${ps.total_points} points in ${ps.games_played} games for ${ps.team_name}`,
          link: `/players/${(ps.player as any)?.id || ps.player_id}`,
          score: ps.ppg,
          playerId: (ps.player as any)?.id || ps.player_id,
        }));

      // Three-point leaders
      const threePointLeaders = (topScorers || [])
        .filter((ps: any) => seasonGradeIds.includes(ps.grade_id) && ps.three_point > 0)
        .map((ps: any) => ({
          ...ps,
          threePG: ps.games_played > 0 ? ps.three_point / ps.games_played : 0,
        }))
        .sort((a: any, b: any) => b.threePG - a.threePG)
        .slice(0, 3)
        .map((ps: any) => ({
          type: "three_point" as const,
          date: null,
          title: `${(ps.player as any)?.first_name || ""} ${(ps.player as any)?.last_name || ""} — ${ps.threePG.toFixed(1)} 3PT/G`,
          description: `${ps.three_point} three-pointers in ${ps.games_played} games`,
          link: `/players/${(ps.player as any)?.id || ps.player_id}`,
          score: ps.threePG,
        }));

      // Game count
      const gameCount = seasonGames.length;
      const dateRange = seasonGames.length > 0
        ? { start: seasonGames[0]?.date, end: seasonGames[seasonGames.length - 1]?.date }
        : null;

      return {
        season: seasonName,
        gameCount,
        dateRange,
        events: [
          ...highScoring,
          ...upsets,
          ...seasonTopScorers,
          ...threePointLeaders,
        ],
      };
    });

    return json({ seasons: result });
  } catch (e: any) {
    return error(e.message || "Unknown error", 500);
  }
}
