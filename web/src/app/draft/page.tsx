"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, User, Cpu, RotateCcw, ChevronRight, Zap, Target, Shield, Flame, Star } from "lucide-react";

interface Player {
  id: string;
  name: string;
  grade: string;
  games: number;
  points: number;
  ppg: number;
  threes: number;
  threesPerGame: number;
  archetype: string;
}

interface Season {
  id: string;
  name: string;
}

const archetypeConfig: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  Scorer: { icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10" },
  Sharpshooter: { icon: Target, color: "text-green-400", bg: "bg-green-400/10" },
  "Two-Way": { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10" },
  "Iron Man": { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10" },
  Balanced: { icon: Star, color: "text-slate-400", bg: "bg-slate-400/10" },
};

export default function DraftPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [available, setAvailable] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<Player[]>([]);
  const [cpuTeam, setCpuTeam] = useState<Player[]>([]);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [draftStarted, setDraftStarted] = useState(false);
  const [draftComplete, setDraftComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickNumber, setPickNumber] = useState(1);

  const ROSTER_SIZE = 5;

  // Load seasons
  useEffect(() => {
    fetch("/api/draft")
      .then(r => r.json())
      .then(d => { setSeasons(d.seasons || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load players for season
  const startDraft = useCallback(async (seasonId: string) => {
    setLoading(true);
    setSelectedSeason(seasonId);
    const res = await fetch(`/api/draft?season=${seasonId}&limit=60`);
    const data = await res.json();
    const p = data.players || [];
    setPlayers(p);
    setAvailable(p);
    setUserTeam([]);
    setCpuTeam([]);
    setIsUserTurn(true);
    setDraftStarted(true);
    setDraftComplete(false);
    setPickNumber(1);
    setLoading(false);
  }, []);

  // CPU pick
  const cpuPick = useCallback((avail: Player[]) => {
    if (avail.length === 0) return;
    // CPU picks best available by PPG (already sorted)
    const pick = avail[0];
    setCpuTeam(prev => [...prev, pick]);
    const remaining = avail.filter(p => p.id !== pick.id);
    setAvailable(remaining);
    setPickNumber(prev => prev + 1);
    setIsUserTurn(true);

    // Check if draft complete
    if (remaining.length === 0 || (userTeam.length >= ROSTER_SIZE && cpuTeam.length + 1 >= ROSTER_SIZE)) {
      setDraftComplete(true);
    }
  }, [userTeam.length, cpuTeam.length]);

  // User pick
  const userPick = useCallback((player: Player) => {
    if (!isUserTurn || draftComplete) return;
    setUserTeam(prev => [...prev, player]);
    const remaining = available.filter(p => p.id !== player.id);
    setAvailable(remaining);
    setPickNumber(prev => prev + 1);
    setIsUserTurn(false);

    // Check completion
    if (userTeam.length + 1 >= ROSTER_SIZE && cpuTeam.length >= ROSTER_SIZE) {
      setDraftComplete(true);
      return;
    }

    // CPU picks after a short delay
    setTimeout(() => {
      cpuPick(remaining);
    }, 800);
  }, [isUserTurn, draftComplete, available, cpuPick, userTeam.length, cpuTeam.length]);

  const resetDraft = () => {
    if (selectedSeason) startDraft(selectedSeason);
  };

  const teamStats = (team: Player[]) => {
    if (team.length === 0) return { avgPpg: 0, totalPts: 0, avgThrees: 0 };
    const avgPpg = +(team.reduce((s, p) => s + p.ppg, 0) / team.length).toFixed(1);
    const totalPts = team.reduce((s, p) => s + p.points, 0);
    const avgThrees = +(team.reduce((s, p) => s + p.threesPerGame, 0) / team.length).toFixed(1);
    return { avgPpg, totalPts, avgThrees };
  };

  const userStats = teamStats(userTeam);
  const cpuStats = teamStats(cpuTeam);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Season selection
  if (!draftStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-400/10 text-blue-400 rounded-full text-sm font-medium mb-4">
              <Trophy className="w-4 h-4" />
              Mock Draft Simulator
            </div>
            <h1 className="text-4xl font-bold mb-3">Build Your Dream Team</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Pick a season, then draft the best players in a head-to-head battle against the CPU.
            </p>
          </div>

          <div className="grid gap-3 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Select a Season</h2>
            {seasons.map(s => (
              <button
                key={s.id}
                onClick={() => startDraft(s.id)}
                className="flex items-center justify-between px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-400/50 hover:bg-slate-800/50 transition-all group"
              >
                <span className="font-medium">{s.name}</span>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
            {seasons.length === 0 && (
              <p className="text-slate-500 text-center py-8">No seasons available.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Draft board
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-blue-400" />
              Mock Draft
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Pick #{pickNumber} • {draftComplete ? "Draft Complete!" : isUserTurn ? "Your Pick" : "CPU Picking..."}
            </p>
          </div>
          <button
            onClick={resetDraft}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Turn indicator */}
        {!draftComplete && (
          <div className={`mb-6 p-3 rounded-xl border text-center text-sm font-medium transition-all ${
            isUserTurn 
              ? "bg-blue-400/10 border-blue-400/30 text-blue-400" 
              : "bg-orange-400/10 border-orange-400/30 text-orange-400"
          }`}>
            {isUserTurn 
              ? `🏀 Your turn! Select a player from the board below (${userTeam.length}/${ROSTER_SIZE})` 
              : "🤖 CPU is making their pick..."}
          </div>
        )}

        {/* Rosters side by side */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* User Team */}
          <div className="bg-slate-900 border border-blue-400/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-blue-400">Your Team</h2>
              <span className="text-xs text-slate-500 ml-auto">{userTeam.length}/{ROSTER_SIZE}</span>
            </div>
            {userTeam.length === 0 ? (
              <p className="text-slate-600 text-sm py-4 text-center">No picks yet</p>
            ) : (
              <div className="space-y-2">
                {userTeam.map((p, i) => (
                  <RosterCard key={p.id} player={p} pickNum={i * 2 + 1} />
                ))}
              </div>
            )}
            {userTeam.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                <StatBox label="Avg PPG" value={userStats.avgPpg} />
                <StatBox label="Total PTS" value={userStats.totalPts} />
                <StatBox label="Avg 3PG" value={userStats.avgThrees} />
              </div>
            )}
          </div>

          {/* CPU Team */}
          <div className="bg-slate-900 border border-orange-400/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-orange-400" />
              <h2 className="font-bold text-orange-400">CPU Team</h2>
              <span className="text-xs text-slate-500 ml-auto">{cpuTeam.length}/{ROSTER_SIZE}</span>
            </div>
            {cpuTeam.length === 0 ? (
              <p className="text-slate-600 text-sm py-4 text-center">No picks yet</p>
            ) : (
              <div className="space-y-2">
                {cpuTeam.map((p, i) => (
                  <RosterCard key={p.id} player={p} pickNum={i * 2 + 2} />
                ))}
              </div>
            )}
            {cpuTeam.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                <StatBox label="Avg PPG" value={cpuStats.avgPpg} />
                <StatBox label="Total PTS" value={cpuStats.totalPts} />
                <StatBox label="Avg 3PG" value={cpuStats.avgThrees} />
              </div>
            )}
          </div>
        </div>

        {/* Draft complete summary */}
        {draftComplete && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-400/10 to-orange-400/10 border border-slate-700 rounded-xl text-center">
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold mb-1">Draft Complete!</h2>
            <p className="text-slate-400 mb-3">
              {userStats.avgPpg > cpuStats.avgPpg 
                ? "🎉 Your team has the higher projected PPG!" 
                : userStats.avgPpg < cpuStats.avgPpg 
                ? "🤖 CPU built a stronger scoring team." 
                : "It's a tie!"}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={resetDraft} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">
                Draft Again
              </button>
              <Link href="/leaderboards" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
                View Leaderboards
              </Link>
            </div>
          </div>
        )}

        {/* Available Players */}
        {!draftComplete && (
          <>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              Draft Board
              <span className="text-sm font-normal text-slate-500">({available.length} available)</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((player, i) => {
                const cfg = archetypeConfig[player.archetype] || archetypeConfig.Balanced;
                const Icon = cfg.icon;
                return (
                  <button
                    key={player.id}
                    onClick={() => userPick(player)}
                    disabled={!isUserTurn}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isUserTurn
                        ? "bg-slate-900 border-slate-800 hover:border-blue-400/50 hover:bg-slate-800/50 cursor-pointer"
                        : "bg-slate-900/50 border-slate-800/50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-slate-500 font-mono">#{i + 1}</span>
                        <h3 className="font-semibold">
                          <Link href={`/players/${player.id}`} onClick={e => e.stopPropagation()} className="hover:text-blue-400 transition-colors">
                            {player.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{player.grade}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {player.archetype}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-400 font-bold">{player.ppg} PPG</span>
                      <span className="text-slate-400">{player.games} GP</span>
                      <span className="text-slate-400">{player.threesPerGame} 3PG</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RosterCard({ player, pickNum }: { player: Player; pickNum: number }) {
  const cfg = archetypeConfig[player.archetype] || archetypeConfig.Balanced;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
      <span className="text-xs text-slate-600 font-mono w-6 text-center">#{pickNum}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{player.name}</p>
        <p className="text-xs text-slate-500 truncate">{player.grade}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs ${cfg.color}`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className="text-sm font-bold text-blue-400 tabular-nums">{player.ppg}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold text-blue-400 tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
