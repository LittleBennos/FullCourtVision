import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { json, error, OPTIONS } from "../../../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PlayerProfile {
  id: string;
  name: string;
  games_played: number;
  total_points: number;
  ppg: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  three_pt_pg: number;
  two_pt_pg: number;
  fouls_pg: number;
  ft_pg: number;
}

async function getTeamWithRoster(teamId: string) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("id", teamId)
    .single();

  if (!team) return null;

  // Record
  const [homeRes, awayRes] = await Promise.all([
    supabase.from("games").select("home_score, away_score").eq("home_team_id", teamId).not("home_score", "is", null),
    supabase.from("games").select("home_score, away_score").eq("away_team_id", teamId).not("home_score", "is", null),
  ]);

  let wins = 0, losses = 0, gp = 0;
  for (const g of homeRes.data || []) { gp++; g.home_score > g.away_score ? wins++ : losses++; }
  for (const g of awayRes.data || []) { gp++; g.away_score > g.home_score ? wins++ : losses++; }

  // Roster
  const { data: grades } = await supabase.from("grades").select("id").eq("season_id", team.season_id);
  if (!grades || grades.length === 0) return { team, record: { wins, losses, gp }, roster: [] };

  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points, one_point, two_point, three_point, total_fouls, players!inner(first_name, last_name)")
    .eq("team_name", team.name)
    .in("grade_id", grades.map((g: any) => g.id));

  const pm = new Map<string, PlayerProfile>();
  for (const s of (stats || []) as any[]) {
    const pid = s.player_id;
    const existing = pm.get(pid);
    if (existing) {
      existing.games_played += s.games_played || 0;
      existing.total_points += s.total_points || 0;
      existing.one_point += s.one_point || 0;
      existing.two_point += s.two_point || 0;
      existing.three_point += s.three_point || 0;
      existing.total_fouls += s.total_fouls || 0;
    } else {
      pm.set(pid, {
        id: pid,
        name: `${s.players?.first_name || ""} ${s.players?.last_name || ""}`.trim(),
        games_played: s.games_played || 0,
        total_points: s.total_points || 0,
        ppg: 0,
        one_point: s.one_point || 0,
        two_point: s.two_point || 0,
        three_point: s.three_point || 0,
        total_fouls: s.total_fouls || 0,
        three_pt_pg: 0,
        two_pt_pg: 0,
        fouls_pg: 0,
        ft_pg: 0,
      });
    }
  }

  const roster = Array.from(pm.values()).map((p) => {
    const gp = p.games_played || 1;
    return {
      ...p,
      ppg: +(p.total_points / gp).toFixed(1),
      three_pt_pg: +(p.three_point / gp).toFixed(1),
      two_pt_pg: +(p.two_point / gp).toFixed(1),
      fouls_pg: +(p.total_fouls / gp).toFixed(1),
      ft_pg: +(p.one_point / gp).toFixed(1),
    };
  }).sort((a, b) => b.ppg - a.ppg);

  return {
    team: {
      id: team.id,
      name: team.name,
      org_name: (team.organisations as any)?.name || "",
      season_name: (team.seasons as any)?.name || "",
    },
    record: { wins, losses, gp },
    roster,
  };
}

type Archetype = "Sharpshooter" | "Inside Scorer" | "High Volume" | "Physical" | "Balanced" | "Free Throw Specialist";

function classifyPlayer(p: PlayerProfile): Archetype {
  if (p.ppg >= 12) return "High Volume";
  if (p.three_pt_pg >= 1.5 && p.three_pt_pg > p.two_pt_pg * 0.5) return "Sharpshooter";
  if (p.fouls_pg >= 2.5) return "Physical";
  if (p.two_pt_pg >= 2 && p.two_pt_pg > p.three_pt_pg * 2) return "Inside Scorer";
  if (p.ft_pg >= 2) return "Free Throw Specialist";
  return "Balanced";
}

function generateGamePlan(myRoster: PlayerProfile[], oppRoster: PlayerProfile[]) {
  // Key threats: top scorers on opponent
  const keyThreats = oppRoster
    .filter((p) => p.games_played >= 2)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      archetype: classifyPlayer(p),
      threat_level: p.ppg >= 12 ? "HIGH" : p.ppg >= 7 ? "MEDIUM" : "LOW",
    }));

  // Players to exploit (weaknesses)
  const weaknesses = oppRoster
    .filter((p) => p.games_played >= 2)
    .map((p) => {
      const issues: string[] = [];
      if (p.fouls_pg >= 2.5) issues.push(`Foul-prone (${p.fouls_pg} FPG) — attack them to draw fouls`);
      if (p.ppg <= 3 && p.games_played >= 3) issues.push(`Low scorer (${p.ppg} PPG) — leave open, pack the paint`);
      if (p.three_pt_pg <= 0.3 && p.two_pt_pg <= 1) issues.push(`Minimal offensive threat — sag off defensively`);
      return { ...p, archetype: classifyPlayer(p), issues };
    })
    .filter((p) => p.issues.length > 0)
    .slice(0, 5);

  // Double-team candidates: opponent top scorer if they score significantly more than #2
  const doubleTeamCandidates = oppRoster.length >= 2 && oppRoster[0].ppg >= oppRoster[1].ppg * 1.4
    ? [oppRoster[0]]
    : [];

  // Foul-out targets
  const foulOutTargets = oppRoster
    .filter((p) => p.games_played >= 2 && p.fouls_pg >= 2.5 && p.ppg >= 5)
    .sort((a, b) => b.fouls_pg - a.fouls_pg)
    .slice(0, 3);

  // Matchup suggestions: pair our players against their similar-ranked players
  const myClassified = myRoster.filter(p => p.games_played >= 2).slice(0, 5).map(p => ({ ...p, archetype: classifyPlayer(p) }));
  const oppClassified = keyThreats;
  
  const matchups = myClassified.slice(0, Math.min(myClassified.length, oppClassified.length)).map((mine, i) => ({
    our_player: { id: mine.id, name: mine.name, ppg: mine.ppg, archetype: mine.archetype },
    their_player: { id: oppClassified[i].id, name: oppClassified[i].name, ppg: oppClassified[i].ppg, archetype: oppClassified[i].archetype },
    note: generateMatchupNote(mine, oppClassified[i]),
  }));

  // Offensive tips
  const offensiveTips: string[] = [];
  const oppTotalFoulsPg = oppRoster.reduce((s, p) => s + p.fouls_pg, 0);
  if (oppTotalFoulsPg >= 8) offensiveTips.push("🏃 Drive aggressively — opponent commits many fouls. Get to the free throw line early.");
  if (foulOutTargets.length > 0) offensiveTips.push(`🎯 Attack ${foulOutTargets.map(p => p.name).join(", ")} to draw fouls and get them in foul trouble.`);
  
  const oppThreePtShooters = oppRoster.filter(p => p.three_pt_pg >= 1.5);
  const myThreePtShooters = myRoster.filter(p => p.three_pt_pg >= 1.5);
  if (myThreePtShooters.length > oppThreePtShooters.length) {
    offensiveTips.push("🎯 We have a 3-point shooting advantage — run plays to get shooters open looks.");
  }
  
  const oppWeakScorers = oppRoster.filter(p => p.ppg < 4 && p.games_played >= 2);
  if (oppWeakScorers.length >= 3) offensiveTips.push("⚡ Opponent has several low-output players. Push tempo and exploit transition before they set up.");
  
  if (offensiveTips.length === 0) offensiveTips.push("📋 Run balanced offense. Focus on ball movement and creating open shots.");

  // Defensive tips
  const defensiveTips: string[] = [];
  if (oppRoster.length > 0 && oppRoster[0].ppg >= 12) {
    defensiveTips.push(`🛡️ ${oppRoster[0].name} is their engine (${oppRoster[0].ppg} PPG). Consider face-guarding or trapping on ball screens.`);
  }
  if (oppThreePtShooters.length >= 2) {
    defensiveTips.push(`🏀 Close out hard on ${oppThreePtShooters.map(p => p.name).join(", ")} — they shoot from deep.`);
  }
  if (oppRoster.filter(p => p.two_pt_pg >= 3).length >= 2) {
    defensiveTips.push("🧱 They score heavily inside. Consider zone defense to pack the paint.");
  }
  const oppTopFT = oppRoster.filter(p => p.ft_pg >= 2);
  if (oppTopFT.length >= 2) {
    defensiveTips.push("⚠️ Avoid fouling — they have reliable free throw shooters.");
  }
  if (defensiveTips.length === 0) defensiveTips.push("🛡️ Play solid man-to-man defense. Contest every shot.");

  return {
    key_threats: keyThreats,
    weaknesses,
    double_team_candidates: doubleTeamCandidates.map(p => ({ id: p.id, name: p.name, ppg: p.ppg })),
    foul_out_targets: foulOutTargets.map(p => ({ id: p.id, name: p.name, ppg: p.ppg, fouls_pg: p.fouls_pg })),
    matchups,
    offensive_tips: offensiveTips,
    defensive_tips: defensiveTips,
  };
}

function generateMatchupNote(ours: PlayerProfile & { archetype: Archetype }, theirs: PlayerProfile & { archetype: Archetype }): string {
  if (theirs.archetype === "Sharpshooter") return `Close out hard — ${theirs.name} shoots from deep`;
  if (theirs.archetype === "Inside Scorer") return `Stay physical — deny the paint`;
  if (theirs.archetype === "High Volume") return `Key matchup — deny easy touches, force tough shots`;
  if (theirs.fouls_pg >= 2.5) return `Attack them — they foul a lot (${theirs.fouls_pg} FPG)`;
  return "Play solid defense and contest shots";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string; opponentId: string }> }) {
  const { teamId, opponentId } = await params;

  if (teamId === opponentId) return error("Cannot generate game plan against the same team");

  const [myTeam, oppTeam] = await Promise.all([
    getTeamWithRoster(teamId),
    getTeamWithRoster(opponentId),
  ]);

  if (!myTeam) return error("Your team not found", 404);
  if (!oppTeam) return error("Opponent team not found", 404);

  const plan = generateGamePlan(myTeam.roster, oppTeam.roster);

  return json({
    data: {
      my_team: { ...myTeam.team, record: myTeam.record },
      opponent: { ...oppTeam.team, record: oppTeam.record },
      ...plan,
    },
  });
}
