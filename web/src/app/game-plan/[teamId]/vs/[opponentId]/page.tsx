import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Swords, Target, AlertTriangle, Users, ClipboardList } from "lucide-react";
import { GamePlanPrintButton } from "./print-button";
import type { Metadata } from "next";

export const revalidate = 3600;

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getGamePlan(teamId: string, opponentId: string) {
  const res = await fetch(`${API_BASE}/api/game-plan/${teamId}/vs/${opponentId}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string; opponentId: string }> }): Promise<Metadata> {
  const { teamId, opponentId } = await params;
  const plan = await getGamePlan(teamId, opponentId);
  if (!plan) return { title: "Game Plan — FullCourtVision" };

  return {
    title: `Game Plan: ${plan.my_team.name} vs ${plan.opponent.name} — FullCourtVision`,
    description: `Coach game plan for ${plan.my_team.name} vs ${plan.opponent.name}. Scouting report, key threats, defensive & offensive strategies.`,
  };
}

export default async function GamePlanPage({ params }: { params: Promise<{ teamId: string; opponentId: string }> }) {
  const { teamId, opponentId } = await params;
  const plan = await getGamePlan(teamId, opponentId);
  if (!plan) notFound();

  const { my_team, opponent, key_threats, weaknesses, double_team_candidates, foul_out_targets, matchups, offensive_tips, defensive_tips } = plan;

  const threatLevelColor = (level: string) => {
    if (level === "HIGH") return "text-red-400 bg-red-400/10 border-red-400/30";
    if (level === "MEDIUM") return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    return "text-green-400 bg-green-400/10 border-green-400/30";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 game-plan-page">
      {/* Nav */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link href={`/teams/${teamId}`} className="inline-flex items-center gap-1 text-accent hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to {my_team.name}
        </Link>
        <span className="text-muted-foreground">|</span>
        <Link href={`/teams/${teamId}/vs/${opponentId}`} className="text-accent hover:underline text-sm">
          Head-to-Head
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-6 h-6 text-accent" />
          <h1 className="text-2xl md:text-3xl font-bold">Coach&apos;s Game Plan</h1>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap mt-4">
          <div className="text-center">
            <Link href={`/teams/${teamId}`} className="text-xl md:text-2xl font-bold text-accent hover:underline">
              {my_team.name}
            </Link>
            <p className="text-sm text-muted-foreground">{my_team.record.wins}W - {my_team.record.losses}L</p>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">vs</span>
          <div className="text-center">
            <Link href={`/teams/${opponentId}`} className="text-xl md:text-2xl font-bold text-accent hover:underline">
              {opponent.name}
            </Link>
            <p className="text-sm text-muted-foreground">{opponent.record.wins}W - {opponent.record.losses}L</p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          {my_team.org_name} · {my_team.season_name}
        </p>
      </div>

      {/* Key Players to Stop */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold">Key Players to Stop</h2>
        </div>

        {key_threats.length === 0 ? (
          <p className="text-muted-foreground text-sm">No significant threats identified (limited data).</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {key_threats.map((player: any) => (
              <div key={player.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/players/${player.id}`} className="font-semibold text-accent hover:underline">
                    {player.name}
                  </Link>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${threatLevelColor(player.threat_level)}`}>
                    {player.threat_level}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="font-bold text-accent">{player.ppg}</p>
                    <p className="text-xs text-muted-foreground">PPG</p>
                  </div>
                  <div>
                    <p className="font-bold">{player.three_pt_pg}</p>
                    <p className="text-xs text-muted-foreground">3PT/G</p>
                  </div>
                  <div>
                    <p className="font-bold">{player.two_pt_pg}</p>
                    <p className="text-xs text-muted-foreground">2PT/G</p>
                  </div>
                  <div>
                    <p className="font-bold">{player.fouls_pg}</p>
                    <p className="text-xs text-muted-foreground">FPG</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {player.archetype} · {player.games_played} games
                </p>
              </div>
            ))}
          </div>
        )}

        {double_team_candidates.length > 0 && (
          <div className="mt-4 p-3 bg-red-400/10 border border-red-400/30 rounded-lg">
            <p className="text-sm font-semibold text-red-400">
              ⚠️ Double-Team Candidate: {double_team_candidates.map((p: any) => `${p.name} (${p.ppg} PPG)`).join(", ")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This player carries a disproportionate scoring load. Consider trapping or sending help defense.
            </p>
          </div>
        )}
      </div>

      {/* Exploit Weaknesses */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold">Exploit Their Weaknesses</h2>
        </div>

        {weaknesses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No significant weaknesses identified in their roster.</p>
        ) : (
          <div className="space-y-3">
            {weaknesses.map((player: any) => (
              <div key={player.id} className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/players/${player.id}`} className="font-semibold text-accent hover:underline">
                    {player.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{player.archetype} · {player.ppg} PPG</span>
                </div>
                <ul className="space-y-1">
                  {player.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-sm text-amber-300">{issue}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {foul_out_targets.length > 0 && (
          <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg">
            <p className="text-sm font-semibold text-amber-400">
              🎯 Foul Trouble Targets
            </p>
            <ul className="mt-1 space-y-1">
              {foul_out_targets.map((p: any) => (
                <li key={p.id} className="text-sm text-muted-foreground">
                  {p.name} — {p.fouls_pg} fouls/game, {p.ppg} PPG. Attack them early to get them in trouble.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Matchups */}
      {matchups.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Suggested Matchups</h2>
          </div>

          <div className="space-y-3">
            {matchups.map((m: any, i: number) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">OURS</span>
                    <Link href={`/players/${m.our_player.id}`} className="font-medium text-accent hover:underline">
                      {m.our_player.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">({m.our_player.ppg} PPG · {m.our_player.archetype})</span>
                  </div>
                  <span className="text-muted-foreground font-bold">vs</span>
                  <div className="flex items-center gap-2">
                    <Link href={`/players/${m.their_player.id}`} className="font-medium hover:underline">
                      {m.their_player.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">({m.their_player.ppg} PPG · {m.their_player.archetype})</span>
                    <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">OPP</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">💡 {m.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Offensive Tips */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold">Offensive Strategy</h2>
          </div>
          <ul className="space-y-3">
            {offensive_tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm bg-muted/30 rounded-lg p-3 border border-border">
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Defensive Tips */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Defensive Strategy</h2>
          </div>
          <ul className="space-y-3">
            {defensive_tips.map((tip: string, i: number) => (
              <li key={i} className="text-sm bg-muted/30 rounded-lg p-3 border border-border">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Print button */}
      <div className="text-center print:hidden">
        <GamePlanPrintButton />
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .game-plan-page { max-width: 100% !important; padding: 0 !important; }
          .game-plan-page a { color: black !important; text-decoration: none !important; }
          .bg-card { background: white !important; border: 1px solid #ccc !important; }
          .bg-muted\\/30 { background: #f5f5f5 !important; }
          .text-accent { color: #b45309 !important; }
          .text-muted-foreground { color: #666 !important; }
          .text-red-400 { color: #dc2626 !important; }
          .text-amber-400, .text-amber-300 { color: #b45309 !important; }
          .text-green-400 { color: #16a34a !important; }
          .text-blue-400 { color: #2563eb !important; }
          nav, header, footer, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
