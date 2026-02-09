import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE = 1000;

async function fetchAllPlayerStats(gradeIds: string[]) {
  const allStats: any[] = [];
  let from = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("player_stats")
      .select(
        "player_id, team_name, games_played, total_points, two_point, three_point, total_fouls, grade_id, players!inner(first_name, last_name)"
      )
      .in("grade_id", gradeIds)
      .range(from, from + PAGE - 1);
    if (!batch || batch.length === 0) break;
    allStats.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return allStats;
}

async function fetchAllGames(gradeIds: string[]) {
  // games connect via rounds -> grades
  const allGames: any[] = [];
  let from = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("games")
      .select(
        "id, home_score, away_score, date, venue, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name), round:rounds!inner(grade_id)"
      )
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .range(from, from + PAGE - 1);
    if (!batch || batch.length === 0) break;
    allGames.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  // Filter to matching grade IDs
  const gradeSet = new Set(gradeIds);
  return allGames.filter((g: any) => gradeSet.has((g.round as any)?.grade_id));
}

type AggPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  games: number;
  points: number;
  twoPt: number;
  threePt: number;
  fouls: number;
  gradeEntries: number; // number of grade entries for consistency proxy
  ppgPerGrade: number[]; // ppg in each grade entry
};

function aggregatePlayers(stats: any[]): AggPlayer[] {
  const map = new Map<string, AggPlayer>();
  for (const s of stats) {
    const pid = s.player_id;
    const p = s.players as any;
    const gp = s.games_played || 0;
    const pts = s.total_points || 0;
    const ppg = gp > 0 ? pts / gp : 0;
    const cur = map.get(pid);
    if (cur) {
      cur.games += gp;
      cur.points += pts;
      cur.twoPt += s.two_point || 0;
      cur.threePt += s.three_point || 0;
      cur.fouls += s.total_fouls || 0;
      cur.gradeEntries++;
      cur.ppgPerGrade.push(ppg);
    } else {
      map.set(pid, {
        id: pid,
        first_name: p?.first_name || "",
        last_name: p?.last_name || "",
        team_name: s.team_name || "",
        games: gp,
        points: pts,
        twoPt: s.two_point || 0,
        threePt: s.three_point || 0,
        fouls: s.total_fouls || 0,
        gradeEntries: 1,
        ppgPerGrade: [ppg],
      });
    }
  }
  return Array.from(map.values());
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const seasonId = params.get("season") || "";

  if (!seasonId) {
    return error("season parameter is required");
  }

  try {
    // Get season info
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date, competition_id, competitions(name)")
      .eq("id", seasonId)
      .single();

    if (!seasonData) return error("Season not found", 404);

    // Get grades for this season
    const { data: grades } = await supabase
      .from("grades")
      .select("id")
      .eq("season_id", seasonId);

    const gradeIds = (grades || []).map((g: any) => g.id);
    if (gradeIds.length === 0) {
      return json({
        season: { id: seasonId, name: seasonData.name, competition: (seasonData.competitions as any)?.name },
        top_scorers: [],
        most_improved: [],
        record_games: [],
        biggest_upsets: [],
        most_consistent: [],
        awards: {},
        summary: { total_players: 0, total_games: 0, total_points: 0, avg_ppg: 0 },
      });
    }

    // Fetch data in parallel
    const [allStats, allGames] = await Promise.all([
      fetchAllPlayerStats(gradeIds),
      fetchAllGames(gradeIds),
    ]);

    const players = aggregatePlayers(allStats);
    const qualified = players.filter((p) => p.games >= 5);

    // --- Top 10 Scorers (by PPG, min 5 games) ---
    const topScorers = [...qualified]
      .sort((a, b) => b.points / b.games - a.points / a.games)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        team: p.team_name,
        ppg: +(p.points / p.games).toFixed(1),
        total_points: p.points,
        games: p.games,
      }));

    // --- Most Improved (need previous season data) ---
    // Find previous season(s) with same competition
    const { data: prevSeasons } = await supabase
      .from("seasons")
      .select("id, name, start_date")
      .eq("competition_id", seasonData.competition_id || "")
      .lt("start_date", seasonData.start_date || "")
      .order("start_date", { ascending: false })
      .limit(1);

    let mostImproved: any[] = [];
    if (prevSeasons && prevSeasons.length > 0) {
      const prevSeasonId = prevSeasons[0].id;
      const { data: prevGrades } = await supabase
        .from("grades")
        .select("id")
        .eq("season_id", prevSeasonId);
      const prevGradeIds = (prevGrades || []).map((g: any) => g.id);
      if (prevGradeIds.length > 0) {
        const prevStats = await fetchAllPlayerStats(prevGradeIds);
        const prevPlayers = aggregatePlayers(prevStats);
        const prevMap = new Map(prevPlayers.map((p) => [p.id, p]));

        mostImproved = qualified
          .filter((p) => {
            const prev = prevMap.get(p.id);
            return prev && prev.games >= 3;
          })
          .map((p) => {
            const prev = prevMap.get(p.id)!;
            const curPpg = p.points / p.games;
            const prevPpg = prev.points / prev.games;
            return {
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              team: p.team_name,
              current_ppg: +curPpg.toFixed(1),
              previous_ppg: +prevPpg.toFixed(1),
              improvement: +(curPpg - prevPpg).toFixed(1),
            };
          })
          .filter((p) => p.improvement > 0)
          .sort((a, b) => b.improvement - a.improvement)
          .slice(0, 10);
      }
    }

    // --- Record Games (highest-scoring games) ---
    const recordGames = [...allGames]
      .map((g: any) => ({
        id: g.id,
        date: g.date,
        venue: g.venue,
        home_team: g.home_team?.name || "Unknown",
        away_team: g.away_team?.name || "Unknown",
        home_score: g.home_score,
        away_score: g.away_score,
        total_score: (g.home_score || 0) + (g.away_score || 0),
        winning_score: Math.max(g.home_score || 0, g.away_score || 0),
      }))
      .sort((a, b) => b.winning_score - a.winning_score)
      .slice(0, 10);

    // --- Biggest Upsets (largest point differentials) ---
    const biggestUpsets = [...allGames]
      .map((g: any) => {
        const diff = Math.abs((g.home_score || 0) - (g.away_score || 0));
        const homeWon = (g.home_score || 0) > (g.away_score || 0);
        return {
          id: g.id,
          date: g.date,
          venue: g.venue,
          home_team: g.home_team?.name || "Unknown",
          away_team: g.away_team?.name || "Unknown",
          home_score: g.home_score,
          away_score: g.away_score,
          differential: diff,
          winner: homeWon ? g.home_team?.name : g.away_team?.name,
        };
      })
      .sort((a, b) => b.differential - a.differential)
      .slice(0, 10);

    // --- Most Consistent (lowest PPG stddev across grades, min 2 grade entries) ---
    const multiGradePlayers = qualified.filter((p) => p.ppgPerGrade.length >= 2);
    const mostConsistent = [...multiGradePlayers]
      .map((p) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        team: p.team_name,
        ppg: +(p.points / p.games).toFixed(1),
        games: p.games,
        stddev: +stddev(p.ppgPerGrade).toFixed(2),
        grade_entries: p.ppgPerGrade.length,
      }))
      .sort((a, b) => a.stddev - b.stddev)
      .slice(0, 10);

    // --- Awards ---
    // MVP: highest PPG, min 10 games
    const mvpCandidates = players.filter((p) => p.games >= 10).sort((a, b) => b.points / b.games - a.points / a.games);
    const mvp = mvpCandidates[0]
      ? {
          id: mvpCandidates[0].id,
          name: `${mvpCandidates[0].first_name} ${mvpCandidates[0].last_name}`,
          team: mvpCandidates[0].team_name,
          stat: `${(mvpCandidates[0].points / mvpCandidates[0].games).toFixed(1)} PPG`,
        }
      : null;

    // Top Scorer: most total points
    const scorers = [...players].sort((a, b) => b.points - a.points);
    const topScorer = scorers[0]
      ? {
          id: scorers[0].id,
          name: `${scorers[0].first_name} ${scorers[0].last_name}`,
          team: scorers[0].team_name,
          stat: `${scorers[0].points} total points`,
        }
      : null;

    // DPOY: most fouls drawn is not great... use lowest fouls per game for high-minute players
    const dpoy = qualified.length > 0
      ? (() => {
          const sorted = [...qualified].filter(p => p.games >= 10).sort((a, b) => a.fouls / a.games - b.fouls / b.games);
          const p = sorted[0];
          return p
            ? { id: p.id, name: `${p.first_name} ${p.last_name}`, team: p.team_name, stat: `${(p.fouls / p.games).toFixed(1)} FPG` }
            : null;
        })()
      : null;

    // 6MOY: player with best PPG who played fewest games (bench player proxy), 5-9 games
    const sixthMan = players
      .filter((p) => p.games >= 5 && p.games <= 9)
      .sort((a, b) => b.points / b.games - a.points / a.games);
    const sixMOY = sixthMan[0]
      ? {
          id: sixthMan[0].id,
          name: `${sixthMan[0].first_name} ${sixthMan[0].last_name}`,
          team: sixthMan[0].team_name,
          stat: `${(sixthMan[0].points / sixthMan[0].games).toFixed(1)} PPG in ${sixthMan[0].games} games`,
        }
      : null;

    // MIP: top of most improved
    const mip = mostImproved[0]
      ? {
          id: mostImproved[0].id,
          name: mostImproved[0].name,
          team: mostImproved[0].team,
          stat: `+${mostImproved[0].improvement} PPG improvement`,
        }
      : null;

    // Sharpshooter: most 3-pointers
    const sharpshooters = [...players].sort((a, b) => b.threePt - a.threePt);
    const sharpshooter = sharpshooters[0]
      ? {
          id: sharpshooters[0].id,
          name: `${sharpshooters[0].first_name} ${sharpshooters[0].last_name}`,
          team: sharpshooters[0].team_name,
          stat: `${sharpshooters[0].threePt} three-pointers`,
        }
      : null;

    // Iron Man: most games played
    const ironManList = [...players].sort((a, b) => b.games - a.games);
    const ironMan = ironManList[0]
      ? {
          id: ironManList[0].id,
          name: `${ironManList[0].first_name} ${ironManList[0].last_name}`,
          team: ironManList[0].team_name,
          stat: `${ironManList[0].games} games played`,
        }
      : null;

    // Summary
    const totalPoints = players.reduce((s, p) => s + p.points, 0);
    const totalGames = allGames.length;
    const avgPpg = qualified.length > 0
      ? +(qualified.reduce((s, p) => s + p.points / p.games, 0) / qualified.length).toFixed(1)
      : 0;

    return json({
      season: {
        id: seasonId,
        name: seasonData.name,
        competition: (seasonData.competitions as any)?.name,
        start_date: seasonData.start_date,
        end_date: seasonData.end_date,
      },
      top_scorers: topScorers,
      most_improved: mostImproved,
      record_games: recordGames,
      biggest_upsets: biggestUpsets,
      most_consistent: mostConsistent,
      awards: { mvp, top_scorer: topScorer, dpoy, sixth_man: sixMOY, mip, sharpshooter, iron_man: ironMan },
      summary: {
        total_players: players.length,
        total_games: totalGames,
        total_points: totalPoints,
        avg_ppg: avgPpg,
      },
    });
  } catch (err: any) {
    return error(err.message || "Internal error", 500);
  }
}
