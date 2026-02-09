import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface RoundAward {
  round_name: string;
  round_number: number | null;
  top_scorer: AwardEntry | null;
  sharpshooter: AwardEntry | null;
  paint_beast: AwardEntry | null;
  mvp: AwardEntry | null;
  top5_scorers: AwardEntry[];
  top5_shooters: AwardEntry[];
  top5_paint: AwardEntry[];
  top5_mvp: AwardEntry[];
}

interface AwardEntry {
  player_id: string;
  player_name: string;
  team_name: string;
  points: number;
  two_point: number;
  three_point: number;
  games_played: number;
  mvp_score: number;
}

interface MostImproved {
  player_id: string;
  player_name: string;
  team_name: string;
  early_ppg: number;
  late_ppg: number;
  improvement: number;
}

export async function GET(request: NextRequest) {
  const seasonName = request.nextUrl.searchParams.get("season");
  if (!seasonName) {
    return NextResponse.json({ error: "season parameter required" }, { status: 400 });
  }

  try {
    // Get season IDs
    const { data: seasons } = await supabase
      .from("seasons")
      .select("id")
      .eq("name", seasonName);

    const seasonIds = (seasons || []).map((s) => s.id);
    if (seasonIds.length === 0) {
      return NextResponse.json({ rounds: [], most_improved: null });
    }

    // Get grades for these seasons
    const { data: grades } = await supabase
      .from("grades")
      .select("id")
      .in("season_id", seasonIds);

    const gradeIds = (grades || []).map((g) => g.id);
    if (gradeIds.length === 0) {
      return NextResponse.json({ rounds: [], most_improved: null });
    }

    // Get rounds for these grades
    const { data: rounds } = await supabase
      .from("rounds")
      .select("id, name, number, grade_id")
      .in("grade_id", gradeIds)
      .order("number", { ascending: true });

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ rounds: [], most_improved: null });
    }

    // Group rounds by name (same round name across grades)
    const roundNameSet = [...new Set(rounds.map((r) => r.name))].sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    // Since player_stats are per-grade (not per-round), we'll compute
    // per-round awards using game-level data and aggregate player stats
    // We'll use player_stats for overall season awards and games for round highlights

    // Fetch all player_stats for the season
    const allStats: any[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("player_stats")
        .select(
          "player_id, team_name, games_played, total_points, two_point, three_point, players!inner(first_name, last_name)"
        )
        .in("grade_id", gradeIds)
        .range(from, from + PAGE - 1);
      if (!batch || batch.length === 0) break;
      allStats.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    // Aggregate by player across all grades
    const playerMap = new Map<
      string,
      {
        player_id: string;
        player_name: string;
        team_name: string;
        games_played: number;
        points: number;
        two_point: number;
        three_point: number;
      }
    >();

    for (const s of allStats) {
      const pid = s.player_id;
      const name = `${(s.players as any)?.first_name || ""} ${(s.players as any)?.last_name || ""}`.trim();
      const ex = playerMap.get(pid);
      if (ex) {
        ex.games_played += s.games_played || 0;
        ex.points += s.total_points || 0;
        ex.two_point += s.two_point || 0;
        ex.three_point += s.three_point || 0;
      } else {
        playerMap.set(pid, {
          player_id: pid,
          player_name: name,
          team_name: s.team_name || "",
          games_played: s.games_played || 0,
          points: s.total_points || 0,
          two_point: s.two_point || 0,
          three_point: s.three_point || 0,
        });
      }
    }

    const players = Array.from(playerMap.values());

    // Compute MVP score: weighted composite
    // PPG * 0.4 + 3PT/game * 0.3 + 2PT/game * 0.3, min 3 games
    function mvpScore(p: (typeof players)[0]) {
      if (p.games_played < 3) return 0;
      const ppg = p.points / p.games_played;
      const tpg = p.three_point / p.games_played;
      const twopg = p.two_point / p.games_played;
      return ppg * 0.4 + tpg * 0.3 + twopg * 0.3;
    }

    function toEntry(p: (typeof players)[0]): AwardEntry {
      return {
        player_id: p.player_id,
        player_name: p.player_name,
        team_name: p.team_name,
        points: p.points,
        two_point: p.two_point,
        three_point: p.three_point,
        games_played: p.games_played,
        mvp_score: Math.round(mvpScore(p) * 100) / 100,
      };
    }

    // Sort for each category
    const byPoints = [...players].filter((p) => p.games_played >= 1).sort((a, b) => b.points - a.points);
    const byThree = [...players].filter((p) => p.games_played >= 1).sort((a, b) => b.three_point - a.three_point);
    const byTwo = [...players].filter((p) => p.games_played >= 1).sort((a, b) => b.two_point - a.two_point);
    const byMvp = [...players].filter((p) => p.games_played >= 3).sort((a, b) => mvpScore(b) - mvpScore(a));

    // Build a single "season" round entry with top 5 per category
    const seasonRound: RoundAward = {
      round_name: "Season Total",
      round_number: 0,
      top_scorer: byPoints[0] ? toEntry(byPoints[0]) : null,
      sharpshooter: byThree[0] ? toEntry(byThree[0]) : null,
      paint_beast: byTwo[0] ? toEntry(byTwo[0]) : null,
      mvp: byMvp[0] ? toEntry(byMvp[0]) : null,
      top5_scorers: byPoints.slice(0, 5).map(toEntry),
      top5_shooters: byThree.slice(0, 5).map(toEntry),
      top5_paint: byTwo.slice(0, 5).map(toEntry),
      top5_mvp: byMvp.slice(0, 5).map(toEntry),
    };

    // Per-grade per-round: we don't have per-round player stats,
    // so we'll create per-grade breakdowns as "rounds"
    // Each grade acts like a "division round"
    const gradeRounds: RoundAward[] = [];

    // Group stats by grade_id
    const statsByGrade = new Map<string, typeof allStats>();
    for (const s of allStats) {
      const gid = s.grade_id || "unknown";
      if (!statsByGrade.has(gid)) statsByGrade.set(gid, []);
      statsByGrade.get(gid)!.push(s);
    }

    // Get grade names
    const { data: gradeDetails } = await supabase
      .from("grades")
      .select("id, name")
      .in("id", gradeIds);

    const gradeNameMap = new Map((gradeDetails || []).map((g) => [g.id, g.name]));

    for (const [gradeId, stats] of statsByGrade) {
      const gradePlayers = new Map<string, (typeof players)[0]>();
      for (const s of stats) {
        const pid = s.player_id;
        const name = `${(s.players as any)?.first_name || ""} ${(s.players as any)?.last_name || ""}`.trim();
        const ex = gradePlayers.get(pid);
        if (ex) {
          ex.games_played += s.games_played || 0;
          ex.points += s.total_points || 0;
          ex.two_point += s.two_point || 0;
          ex.three_point += s.three_point || 0;
        } else {
          gradePlayers.set(pid, {
            player_id: pid,
            player_name: name,
            team_name: s.team_name || "",
            games_played: s.games_played || 0,
            points: s.total_points || 0,
            two_point: s.two_point || 0,
            three_point: s.three_point || 0,
          });
        }
      }

      const gPlayers = Array.from(gradePlayers.values());
      const gByPoints = [...gPlayers].filter((p) => p.games_played >= 1).sort((a, b) => b.points - a.points);
      const gByThree = [...gPlayers].filter((p) => p.games_played >= 1).sort((a, b) => b.three_point - a.three_point);
      const gByTwo = [...gPlayers].filter((p) => p.games_played >= 1).sort((a, b) => b.two_point - a.two_point);
      const gByMvp = [...gPlayers].filter((p) => p.games_played >= 1).sort((a, b) => mvpScore(b) - mvpScore(a));

      gradeRounds.push({
        round_name: gradeNameMap.get(gradeId) || gradeId,
        round_number: null,
        top_scorer: gByPoints[0] ? toEntry(gByPoints[0]) : null,
        sharpshooter: gByThree[0] ? toEntry(gByThree[0]) : null,
        paint_beast: gByTwo[0] ? toEntry(gByTwo[0]) : null,
        mvp: gByMvp[0] ? toEntry(gByMvp[0]) : null,
        top5_scorers: gByPoints.slice(0, 5).map(toEntry),
        top5_shooters: gByThree.slice(0, 5).map(toEntry),
        top5_paint: gByTwo.slice(0, 5).map(toEntry),
        top5_mvp: gByMvp.slice(0, 5).map(toEntry),
      });
    }

    // Sort grade rounds alphabetically
    gradeRounds.sort((a, b) => a.round_name.localeCompare(b.round_name));

    // Most Improved: compare first half vs second half of grades
    // Split grades in half and compare PPG
    let mostImproved: MostImproved | null = null;
    if (gradeIds.length >= 2) {
      const half = Math.floor(gradeIds.length / 2);
      const earlyGradeIds = gradeIds.slice(0, half);
      const lateGradeIds = gradeIds.slice(half);

      const earlyStats = allStats.filter((s: any) => earlyGradeIds.includes(s.grade_id));
      const lateStats = allStats.filter((s: any) => lateGradeIds.includes(s.grade_id));

      const earlyMap = new Map<string, { points: number; games: number; name: string; team: string }>();
      const lateMap = new Map<string, { points: number; games: number; name: string; team: string }>();

      for (const s of earlyStats) {
        const pid = s.player_id;
        const name = `${(s.players as any)?.first_name || ""} ${(s.players as any)?.last_name || ""}`.trim();
        const ex = earlyMap.get(pid);
        if (ex) {
          ex.points += s.total_points || 0;
          ex.games += s.games_played || 0;
        } else {
          earlyMap.set(pid, { points: s.total_points || 0, games: s.games_played || 0, name, team: s.team_name || "" });
        }
      }
      for (const s of lateStats) {
        const pid = s.player_id;
        const name = `${(s.players as any)?.first_name || ""} ${(s.players as any)?.last_name || ""}`.trim();
        const ex = lateMap.get(pid);
        if (ex) {
          ex.points += s.total_points || 0;
          ex.games += s.games_played || 0;
        } else {
          lateMap.set(pid, { points: s.total_points || 0, games: s.games_played || 0, name, team: s.team_name || "" });
        }
      }

      let bestImprovement = -Infinity;
      for (const [pid, late] of lateMap) {
        const early = earlyMap.get(pid);
        if (!early || early.games < 2 || late.games < 2) continue;
        const earlyPpg = early.points / early.games;
        const latePpg = late.points / late.games;
        const improvement = latePpg - earlyPpg;
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          mostImproved = {
            player_id: pid,
            player_name: late.name,
            team_name: late.team,
            early_ppg: Math.round(earlyPpg * 10) / 10,
            late_ppg: Math.round(latePpg * 10) / 10,
            improvement: Math.round(improvement * 10) / 10,
          };
        }
      }
    }

    return NextResponse.json({
      rounds: [seasonRound, ...gradeRounds],
      most_improved: mostImproved,
    });
  } catch (error) {
    console.error("Weekly awards error:", error);
    return NextResponse.json({ error: "Failed to fetch weekly awards" }, { status: 500 });
  }
}
