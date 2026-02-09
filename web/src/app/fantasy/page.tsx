"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Search, Plus, X, Trophy, Gamepad2, Trash2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  team: string;
  grade: string;
  games: number;
  ppg: number;
  twoPtPG: number;
  threePtPG: number;
  fantasyPPG: number;
}

interface FantasyTeam {
  id: string;
  name: string;
  players: Player[];
  totalScore: number;
  createdAt: string;
}

const TEAM_SIZE = 5;
const LS_KEY = "fcv-fantasy-teams";

function loadTeams(): FantasyTeam[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTeams(teams: FantasyTeam[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(teams));
}

export default function FantasyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [roster, setRoster] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");
  const [savedTeams, setSavedTeams] = useState<FantasyTeam[]>([]);
  const [tab, setTab] = useState<"draft" | "leaderboard">("draft");

  useEffect(() => {
    setSavedTeams(loadTeams());
  }, []);

  const fetchPlayers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (gradeFilter) params.set("grade", gradeFilter);
    if (teamFilter) params.set("team", teamFilter);
    fetch(`/api/fantasy?${params}`)
      .then((r) => r.json())
      .then((data) => setPlayers(data.players || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, gradeFilter, teamFilter]);

  useEffect(() => {
    const t = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(t);
  }, [fetchPlayers]);

  const addToRoster = (p: Player) => {
    if (roster.length >= TEAM_SIZE || roster.find((r) => r.id === p.id)) return;
    setRoster([...roster, p]);
  };

  const removeFromRoster = (id: string) => {
    setRoster(roster.filter((r) => r.id !== id));
  };

  const projectedWeekly = roster.reduce((s, p) => s + p.fantasyPPG, 0);

  const saveTeam = () => {
    if (roster.length !== TEAM_SIZE) return;
    const team: FantasyTeam = {
      id: Date.now().toString(),
      name: teamName || `Team ${savedTeams.length + 1}`,
      players: roster,
      totalScore: +projectedWeekly.toFixed(1),
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedTeams, team].sort((a, b) => b.totalScore - a.totalScore);
    saveTeams(updated);
    setSavedTeams(updated);
    setRoster([]);
    setTeamName("");
    setTab("leaderboard");
  };

  const deleteTeam = (id: string) => {
    const updated = savedTeams.filter((t) => t.id !== id);
    saveTeams(updated);
    setSavedTeams(updated);
  };

  const rosterIds = new Set(roster.map((r) => r.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Fantasy League" }]} />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🎮 Fantasy Basketball</h1>
        <p className="text-muted-foreground">
          Draft a 5-player team from any grade. Projected weekly score is based on real per-game averages
          with a 3PT bonus (PPG + 0.5× 3PT/game).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("draft")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "draft" ? "bg-amber-500 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gamepad2 className="w-4 h-4 inline mr-1.5" />
          Draft Team
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "leaderboard" ? "bg-amber-500 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-1.5" />
          Leaderboard
          {savedTeams.length > 0 && (
            <span className="ml-1.5 bg-amber-400/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
              {savedTeams.length}
            </span>
          )}
        </button>
      </div>

      {tab === "draft" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster panel */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-card border border-border rounded-xl p-5 sticky top-20">
              <h2 className="text-lg font-semibold mb-3">Your Roster ({roster.length}/{TEAM_SIZE})</h2>
              <input
                type="text"
                placeholder="Team name..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {roster.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Click + to add players from the list
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {roster.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.grade} · {p.fantasyPPG} FPG</p>
                      </div>
                      <button
                        onClick={() => removeFromRoster(p.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Projected Weekly Score</span>
                  <span className="font-bold text-amber-400 text-lg">{projectedWeekly.toFixed(1)}</span>
                </div>
                <button
                  onClick={saveTeam}
                  disabled={roster.length !== TEAM_SIZE}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Team
                </button>
              </div>
            </div>
          </div>

          {/* Player list */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search player..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <input
                type="text"
                placeholder="Grade..."
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-28 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <input
                type="text"
                placeholder="Team..."
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-28 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No players found.</p>
                <p className="text-sm mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium w-12"></th>
                        <th className="px-4 py-3 font-medium">Player</th>
                        <th className="px-4 py-3 font-medium">Team</th>
                        <th className="px-4 py-3 font-medium">Grade</th>
                        <th className="px-4 py-3 font-medium text-right">GP</th>
                        <th className="px-4 py-3 font-medium text-right">PPG</th>
                        <th className="px-4 py-3 font-medium text-right">2PT/G</th>
                        <th className="px-4 py-3 font-medium text-right">3PT/G</th>
                        <th className="px-4 py-3 font-medium text-right text-amber-400">Fantasy/G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p) => {
                        const inRoster = rosterIds.has(p.id);
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-border/50 transition-colors ${
                              inRoster ? "bg-amber-500/10" : "hover:bg-muted/30"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <button
                                onClick={() => addToRoster(p)}
                                disabled={inRoster || roster.length >= TEAM_SIZE}
                                className="text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/players/${p.id}`}
                                className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
                              >
                                {p.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">{p.team}</td>
                            <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{p.grade}</td>
                            <td className="px-4 py-3 text-right">{p.games}</td>
                            <td className="px-4 py-3 text-right">{p.ppg}</td>
                            <td className="px-4 py-3 text-right">{p.twoPtPG}</td>
                            <td className="px-4 py-3 text-right">{p.threePtPG}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-400">{p.fantasyPPG}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "leaderboard" && (
        <div>
          {savedTeams.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No fantasy teams yet.</p>
              <p className="text-sm mt-1">Draft a 5-player team to see it on the leaderboard.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedTeams.map((team, i) => (
                <div key={team.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                        #{i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-lg">{team.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(team.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-400">{team.totalScore}</p>
                        <p className="text-xs text-muted-foreground">Fantasy/Week</p>
                      </div>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {team.players.map((p) => (
                      <div key={p.id} className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                        <Link href={`/players/${p.id}`} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.fantasyPPG} FPG</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
