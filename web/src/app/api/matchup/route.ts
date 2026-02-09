import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Archetype = "Sharpshooter" | "Inside Scorer" | "High Volume" | "Physical" | "Balanced";

function computeArchetype(ppg: number, threePtPg: number, twoPtPg: number, foulsPg: number): Archetype {
  if (ppg >= 15) return "High Volume";
  if (threePtPg >= 2 && threePtPg > twoPtPg * 0.6) return "Sharpshooter";
  if (foulsPg >= 3 || (foulsPg >= 2 && ppg < 8)) return "Physical";
  if (twoPtPg >= 3 && twoPtPg > threePtPg * 2) return "Inside Scorer";
  return "Balanced";
}

// Archetype advantage matrix: [attacker] vs [defender] => bonus (0-15)
const ARCHETYPE_ADVANTAGES: Record<Archetype, Partial<Record<Archetype, number>>> = {
  "Sharpshooter": { "Inside Scorer": 12, "Physical": 8, "Balanced": 4 },
  "Inside Scorer": { "Balanced": 10, "High Volume": 6, "Sharpshooter": -5 },
  "High Volume": { "Physical": 10, "Sharpshooter": 5, "Balanced": 3 },
  "Physical": { "Inside Scorer": 8, "Balanced": 5, "High Volume": -5 },
  "Balanced": { "Physical": 4 },
};

interface PlayerStats {
  id: string;
  name: string;
  games: number;
  ppg: number;
  threePtPg: number;
  twoPtPg: number;
  foulsPg: number;
  efficiency: number;
  archetype: Archetype;
}

async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  // Get aggregate info
  const { data: agg } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg")
    .eq("player_id", playerId)
    .single();

  if (!agg) return null;

  // Get detailed stats from player_stats
  const { data: stats } = await supabase
    .from("player_stats")
    .select("games_played, total_points, two_point, three_point, total_fouls")
    .eq("player_id", playerId);

  let totalGames = agg.total_games || 0;
  let totalPoints = agg.total_points || 0;
  let totalTwos = 0;
  let totalThrees = 0;
  let totalFouls = 0;

  if (stats && stats.length > 0) {
    totalGames = 0;
    totalPoints = 0;
    for (const s of stats) {
      totalGames += s.games_played || 0;
      totalPoints += s.total_points || 0;
      totalTwos += s.two_point || 0;
      totalThrees += s.three_point || 0;
      totalFouls += s.total_fouls || 0;
    }
  }

  const g = Math.max(totalGames, 1);
  const ppg = +(totalPoints / g).toFixed(1);
  const threePtPg = +(totalThrees / g).toFixed(1);
  const twoPtPg = +(totalTwos / g).toFixed(1);
  const foulsPg = +(totalFouls / g).toFixed(1);
  const efficiency = foulsPg > 0 ? +(ppg / foulsPg).toFixed(2) : ppg;

  return {
    id: playerId,
    name: `${agg.first_name} ${agg.last_name}`,
    games: totalGames,
    ppg,
    threePtPg,
    twoPtPg,
    foulsPg,
    efficiency,
    archetype: computeArchetype(ppg, threePtPg, twoPtPg, foulsPg),
  };
}

function predictMatchup(p1: PlayerStats, p2: PlayerStats) {
  let p1Score = 50; // Start at 50-50

  // PPG advantage (up to 20 points)
  const ppgDiff = p1.ppg - p2.ppg;
  p1Score += Math.max(-20, Math.min(20, ppgDiff * 3));

  // Efficiency advantage (up to 10 points)
  const effDiff = p1.efficiency - p2.efficiency;
  p1Score += Math.max(-10, Math.min(10, effDiff * 2));

  // Experience advantage (up to 10 points)
  const gamesDiff = p1.games - p2.games;
  p1Score += Math.max(-10, Math.min(10, gamesDiff * 0.1));

  // Archetype advantage (up to 15 points)
  const p1Adv = ARCHETYPE_ADVANTAGES[p1.archetype]?.[p2.archetype] || 0;
  const p2Adv = ARCHETYPE_ADVANTAGES[p2.archetype]?.[p1.archetype] || 0;
  p1Score += p1Adv - p2Adv;

  // Clamp to 5-95
  p1Score = Math.max(5, Math.min(95, Math.round(p1Score)));

  const archetypeAnalysis = getArchetypeAnalysis(p1, p2, p1Adv, p2Adv);

  return {
    player1WinPct: p1Score,
    player2WinPct: 100 - p1Score,
    winner: p1Score >= 50 ? p1.id : p2.id,
    archetypeAnalysis,
    factors: {
      ppgAdvantage: ppgDiff > 0 ? p1.name : p2.name,
      efficiencyAdvantage: effDiff > 0 ? p1.name : p2.name,
      experienceAdvantage: gamesDiff > 0 ? p1.name : p2.name,
      archetypeAdvantage: p1Adv > p2Adv ? p1.name : p2Adv > p1Adv ? p2.name : "Even",
    },
  };
}

function getArchetypeAnalysis(p1: PlayerStats, p2: PlayerStats, p1Adv: number, p2Adv: number): string {
  if (p1Adv > p2Adv) {
    return `${p1.archetype} has a natural advantage over ${p2.archetype}. ${p1.name}'s playstyle exploits ${p2.name}'s weaknesses.`;
  } else if (p2Adv > p1Adv) {
    return `${p2.archetype} has a natural advantage over ${p1.archetype}. ${p2.name}'s playstyle exploits ${p1.name}'s weaknesses.`;
  }
  return `${p1.archetype} vs ${p2.archetype} is an even archetype matchup. This one comes down to raw stats.`;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const p1Id = params.get("player1");
  const p2Id = params.get("player2");

  if (!p1Id || !p2Id) return error("Both player1 and player2 IDs are required");
  if (p1Id === p2Id) return error("Cannot compare a player to themselves");

  const [player1, player2] = await Promise.all([
    getPlayerStats(p1Id),
    getPlayerStats(p2Id),
  ]);

  if (!player1) return error("Player 1 not found", 404);
  if (!player2) return error("Player 2 not found", 404);

  const prediction = predictMatchup(player1, player2);

  return json({
    player1,
    player2,
    prediction,
  });
}
