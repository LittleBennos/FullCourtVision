import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeArchetype } from "@/components/archetype-badge";

export async function GET(request: NextRequest) {
  const seasonName = request.nextUrl.searchParams.get("season");
  const gradeName = request.nextUrl.searchParams.get("grade"); // optional

  if (!seasonName) {
    return NextResponse.json({ error: "season parameter required" }, { status: 400 });
  }

  // Get season IDs matching this name
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", seasonName);

  const seasonIds = (seasons || []).map((s) => s.id);
  if (seasonIds.length === 0) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // Get grades for these seasons
  let gradesQuery = supabase
    .from("grades")
    .select("id, name, season_id")
    .in("season_id", seasonIds);

  if (gradeName) {
    gradesQuery = gradesQuery.eq("name", gradeName);
  }

  const { data: grades } = await gradesQuery;
  const gradeIds = (grades || []).map((g) => g.id);
  if (gradeIds.length === 0) {
    return NextResponse.json({ allStars: [], honorableMentions: [], grades: [] });
  }

  // Fetch player stats for these grades
  // Supabase .in() has a limit, batch if needed
  const batchSize = 100;
  const allStats: any[] = [];
  for (let i = 0; i < gradeIds.length; i += batchSize) {
    const batch = gradeIds.slice(i, i + batchSize);
    const { data } = await supabase
      .from("player_stats")
      .select(`
        player_id,
        games_played,
        total_points,
        two_point,
        three_point,
        total_fouls,
        grade_id,
        team_name,
        players!inner(first_name, last_name),
        grades!inner(name)
      `)
      .in("grade_id", batch);
    if (data) allStats.push(...data);
  }

  // Aggregate per player
  const playerMap = new Map<
    string,
    {
      player_id: string;
      first_name: string;
      last_name: string;
      team_name: string;
      grade_name: string;
      games: number;
      points: number;
      twoPt: number;
      threePt: number;
      fouls: number;
    }
  >();

  for (const row of allStats) {
    const pid = row.player_id;
    const existing = playerMap.get(pid);
    if (existing) {
      existing.games += row.games_played || 0;
      existing.points += row.total_points || 0;
      existing.twoPt += row.two_point || 0;
      existing.threePt += row.three_point || 0;
      existing.fouls += row.total_fouls || 0;
    } else {
      playerMap.set(pid, {
        player_id: pid,
        first_name: (row.players as any)?.first_name || "",
        last_name: (row.players as any)?.last_name || "",
        team_name: row.team_name || "",
        grade_name: (row.grades as any)?.name || "",
        games: row.games_played || 0,
        points: row.total_points || 0,
        twoPt: row.two_point || 0,
        threePt: row.three_point || 0,
        fouls: row.total_fouls || 0,
      });
    }
  }

  // Build scored players (min 3 games)
  const players = Array.from(playerMap.values())
    .filter((p) => p.games >= 3)
    .map((p) => {
      const ppg = p.points / p.games;
      const twoPtPg = p.twoPt / p.games;
      const threePtPg = p.threePt / p.games;
      const foulsPg = p.fouls / p.games;
      const archetype = computeArchetype(ppg, threePtPg, twoPtPg, foulsPg);

      // Efficiency: points per foul (higher = better), with floor
      const efficiency = p.fouls > 0 ? p.points / p.fouls : p.points;

      // Score: PPG primary (70%), efficiency secondary (30%)
      const score = ppg * 0.7 + Math.min(efficiency, 30) * 0.3;

      return {
        player_id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        team_name: p.team_name,
        grade_name: p.grade_name,
        games: p.games,
        ppg: +ppg.toFixed(1),
        twoPtPg: +twoPtPg.toFixed(1),
        threePtPg: +threePtPg.toFixed(1),
        foulsPg: +foulsPg.toFixed(1),
        archetype,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Select best 5 with archetype diversity (at least 3 different archetypes)
  const allStars = selectAllStarTeam(players, 5);
  const allStarIds = new Set(allStars.map((p) => p.player_id));
  const honorableMentions = players
    .filter((p) => !allStarIds.has(p.player_id))
    .slice(0, 5);

  // Available grade names
  const gradeNames = [...new Set((grades || []).map((g) => g.name))].sort();

  return NextResponse.json({ allStars, honorableMentions, grades: gradeNames });
}

function selectAllStarTeam(
  rankedPlayers: any[],
  teamSize: number
): any[] {
  if (rankedPlayers.length <= teamSize) return rankedPlayers.slice(0, teamSize);

  // Greedy: pick top players while ensuring archetype diversity
  // First pass: try to get at least 3 different archetypes
  const team: any[] = [];
  const archetypeCounts = new Map<string, number>();

  // Always take the #1 player
  const top = rankedPlayers[0];
  team.push(top);
  archetypeCounts.set(top.archetype, 1);

  const remaining = rankedPlayers.slice(1);

  // Fill remaining spots
  for (let spot = 1; spot < teamSize; spot++) {
    const uniqueArchetypes = archetypeCounts.size;
    const spotsLeft = teamSize - team.length;
    const archetypesNeeded = Math.max(0, 3 - uniqueArchetypes);

    let pick: any = null;
    let pickIdx = -1;

    if (archetypesNeeded >= spotsLeft) {
      // Must pick a new archetype
      for (let i = 0; i < remaining.length; i++) {
        if (!archetypeCounts.has(remaining[i].archetype)) {
          pick = remaining[i];
          pickIdx = i;
          break;
        }
      }
    }

    if (!pick) {
      // Pick highest scored remaining
      pick = remaining[0];
      pickIdx = 0;
    }

    if (pick) {
      team.push(pick);
      archetypeCounts.set(pick.archetype, (archetypeCounts.get(pick.archetype) || 0) + 1);
      remaining.splice(pickIdx, 1);
    }
  }

  return team;
}
