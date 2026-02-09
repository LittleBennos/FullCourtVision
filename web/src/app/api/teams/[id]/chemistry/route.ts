import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Archetype definitions based on scoring profile
function getArchetype(stats: { ppg: number; threePct: number; twoPct: number; onePct: number; foulRate: number }): string {
  const { ppg, threePct, twoPct, onePct, foulRate } = stats;
  if (threePct > 0.4) return "Sharpshooter";
  if (twoPct > 0.5 && ppg > 8) return "Scorer";
  if (onePct > 0.4) return "Free-Throw Merchant";
  if (foulRate > 0.3) return "Enforcer";
  if (ppg > 6) return "All-Rounder";
  if (ppg > 3) return "Role Player";
  return "Bench Contributor";
}

// Synergy scores between archetypes (0-1)
const SYNERGY_MAP: Record<string, Record<string, number>> = {
  Sharpshooter:        { Scorer: 0.95, Enforcer: 0.8, "All-Rounder": 0.85, "Role Player": 0.7, "Free-Throw Merchant": 0.6, "Bench Contributor": 0.5, Sharpshooter: 0.5 },
  Scorer:              { Sharpshooter: 0.95, Enforcer: 0.85, "All-Rounder": 0.8, "Role Player": 0.75, "Free-Throw Merchant": 0.65, "Bench Contributor": 0.55, Scorer: 0.4 },
  Enforcer:            { Scorer: 0.85, Sharpshooter: 0.8, "All-Rounder": 0.75, "Role Player": 0.7, "Free-Throw Merchant": 0.6, "Bench Contributor": 0.5, Enforcer: 0.3 },
  "All-Rounder":       { Scorer: 0.8, Sharpshooter: 0.85, Enforcer: 0.75, "Role Player": 0.7, "Free-Throw Merchant": 0.65, "Bench Contributor": 0.6, "All-Rounder": 0.6 },
  "Role Player":       { Scorer: 0.75, Sharpshooter: 0.7, Enforcer: 0.7, "All-Rounder": 0.7, "Free-Throw Merchant": 0.6, "Bench Contributor": 0.55, "Role Player": 0.5 },
  "Free-Throw Merchant": { Scorer: 0.65, Sharpshooter: 0.6, Enforcer: 0.6, "All-Rounder": 0.65, "Role Player": 0.6, "Bench Contributor": 0.5, "Free-Throw Merchant": 0.4 },
  "Bench Contributor": { Scorer: 0.55, Sharpshooter: 0.5, Enforcer: 0.5, "All-Rounder": 0.6, "Role Player": 0.55, "Free-Throw Merchant": 0.5, "Bench Contributor": 0.3 },
};

function getSynergy(a1: string, a2: string): number {
  return SYNERGY_MAP[a1]?.[a2] ?? 0.5;
}

interface PlayerProfile {
  id: string;
  name: string;
  archetype: string;
  ppg: number;
  gamesPlayed: number;
  totalPoints: number;
  onePoint: number;
  twoPoint: number;
  threePoint: number;
  totalFouls: number;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Get team info
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("id", id)
    .single();

  if (teamErr || !team) return error("Team not found", 404);

  // Get grades for season
  const { data: grades } = await supabase.from("grades").select("id").eq("season_id", team.season_id);
  if (!grades || grades.length === 0) return json({ data: { players: [], pairs: [], overallScore: 0, archetypeBreakdown: [], bestLineup: [] } });

  const gradeIds = grades.map((g: { id: string }) => g.id);

  // Get player stats
  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points, one_point, two_point, three_point, total_fouls, players!inner(first_name, last_name)")
    .eq("team_name", team.name)
    .in("grade_id", gradeIds);

  if (!stats || stats.length === 0) return json({ data: { players: [], pairs: [], overallScore: 0, archetypeBreakdown: [], bestLineup: [] } });

  // Aggregate by player
  const pm = new Map<string, PlayerProfile>();
  for (const s of stats) {
    const existing = pm.get(s.player_id);
    if (existing) {
      existing.gamesPlayed += s.games_played || 0;
      existing.totalPoints += s.total_points || 0;
      existing.onePoint += s.one_point || 0;
      existing.twoPoint += s.two_point || 0;
      existing.threePoint += s.three_point || 0;
      existing.totalFouls += s.total_fouls || 0;
    } else {
      pm.set(s.player_id, {
        id: s.player_id,
        name: `${(s.players as any)?.first_name || ""} ${(s.players as any)?.last_name || ""}`.trim(),
        archetype: "",
        ppg: 0,
        gamesPlayed: s.games_played || 0,
        totalPoints: s.total_points || 0,
        onePoint: s.one_point || 0,
        twoPoint: s.two_point || 0,
        threePoint: s.three_point || 0,
        totalFouls: s.total_fouls || 0,
      });
    }
  }

  // Calculate archetypes
  const players: PlayerProfile[] = [];
  for (const p of pm.values()) {
    p.ppg = p.gamesPlayed > 0 ? +(p.totalPoints / p.gamesPlayed).toFixed(1) : 0;
    const totalShots = p.onePoint + p.twoPoint + p.threePoint;
    const threePct = totalShots > 0 ? p.threePoint / totalShots : 0;
    const twoPct = totalShots > 0 ? p.twoPoint / totalShots : 0;
    const onePct = totalShots > 0 ? p.onePoint / totalShots : 0;
    const foulRate = p.gamesPlayed > 0 ? p.totalFouls / p.gamesPlayed / 5 : 0; // normalized
    p.archetype = getArchetype({ ppg: p.ppg, threePct, twoPct, onePct, foulRate });
    players.push(p);
  }

  players.sort((a, b) => b.ppg - a.ppg);

  // Calculate pair chemistry
  const pairs: { player1: string; player2: string; p1Name: string; p2Name: string; score: number; reason: string }[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i], p2 = players[j];
      const synergy = getSynergy(p1.archetype, p2.archetype);
      // Stat balance bonus: complementary scorers get a boost
      const ppgDiff = Math.abs(p1.ppg - p2.ppg);
      const balanceBonus = ppgDiff > 3 ? 0.1 : ppgDiff > 1 ? 0.05 : 0;
      const score = Math.min(1, +(synergy + balanceBonus).toFixed(2));
      const reason = p1.archetype === p2.archetype
        ? `Both ${p1.archetype}s — may overlap`
        : `${p1.archetype} + ${p2.archetype} — complementary styles`;
      pairs.push({ player1: p1.id, player2: p2.id, p1Name: p1.name, p2Name: p2.name, score, reason });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  // Archetype breakdown
  const archetypeCounts: Record<string, number> = {};
  for (const p of players) {
    archetypeCounts[p.archetype] = (archetypeCounts[p.archetype] || 0) + 1;
  }
  const archetypeBreakdown = Object.entries(archetypeCounts).map(([name, count]) => ({ name, count }));

  // Overall chemistry score: average of top pairs (or all if ≤10 pairs)
  const topPairs = pairs.slice(0, Math.max(10, Math.ceil(pairs.length * 0.3)));
  const overallScore = topPairs.length > 0
    ? +(topPairs.reduce((s, p) => s + p.score, 0) / topPairs.length * 100).toFixed(0)
    : 0;

  // Best lineup: pick 5 players maximizing diversity + chemistry
  const bestLineup = selectBestLineup(players, 5);

  return json({
    data: {
      teamName: team.name,
      players: players.map(p => ({ id: p.id, name: p.name, archetype: p.archetype, ppg: p.ppg, gamesPlayed: p.gamesPlayed })),
      pairs: pairs.slice(0, 50), // top 50 pairs
      overallScore,
      archetypeBreakdown,
      bestLineup,
    },
  });
}

function selectBestLineup(players: PlayerProfile[], size: number): { id: string; name: string; archetype: string; ppg: number }[] {
  if (players.length <= size) return players.map(p => ({ id: p.id, name: p.name, archetype: p.archetype, ppg: p.ppg }));

  // Greedy: start with top scorer, then add player with best avg synergy to existing lineup
  const lineup: PlayerProfile[] = [players[0]];
  const remaining = new Set(players.slice(1));

  while (lineup.length < size && remaining.size > 0) {
    let bestPlayer: PlayerProfile | null = null;
    let bestScore = -1;

    for (const candidate of remaining) {
      let totalSynergy = 0;
      for (const member of lineup) {
        totalSynergy += getSynergy(candidate.archetype, member.archetype);
      }
      // Weight: synergy + ppg contribution
      const score = totalSynergy / lineup.length + candidate.ppg * 0.05;
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = candidate;
      }
    }

    if (bestPlayer) {
      lineup.push(bestPlayer);
      remaining.delete(bestPlayer);
    } else break;
  }

  return lineup.map(p => ({ id: p.id, name: p.name, archetype: p.archetype, ppg: p.ppg }));
}
