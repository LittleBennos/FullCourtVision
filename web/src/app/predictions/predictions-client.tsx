"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Trophy, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/* ── Types ─────────────────────────────────────────────────────── */

interface TeamOption {
  id: string;
  name: string;
  organisation_name: string;
  season_name: string;
  wins: number;
  losses: number;
  games_played: number;
}

interface TopPlayer {
  name: string;
  ppg: number;
  games: number;
}

interface TeamData {
  id: string;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  avgPpg: number;
  topPlayers: TopPlayer[];
}

interface Factor {
  label: string;
  team1Value: string;
  team2Value: string;
  advantage: "team1" | "team2" | "even";
}

interface RecentGame {
  date: string;
  team1Score: number;
  team2Score: number;
  winner: string;
}

interface PredictionResult {
  team1: TeamData;
  team2: TeamData;
  headToHead: {
    team1Wins: number;
    team2Wins: number;
    totalGames: number;
    recentGames: RecentGame[];
  };
  prediction: {
    team1WinPct: number;
    team2WinPct: number;
    factors: Factor[];
  };
}

/* ── Colors ────────────────────────────────────────────────────── */

const AMBER = "#f59e0b";
const BLUE = "#3b82f6";
const AMBER_BG = "rgba(245,158,11,0.12)";
const BLUE_BG = "rgba(59,130,246,0.12)";

/* ── Team Search Dropdown ──────────────────────────────────────── */

function TeamSearchDropdown({
  label,
  selected,
  onSelect,
  accent,
}: {
  label: string;
  selected: TeamOption | null;
  onSelect: (t: TeamOption | null) => void;
  accent: "amber" | "blue";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TeamOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const accentColor = accent === "amber" ? AMBER : BLUE;
  const ringClass = accent === "amber" ? "focus:ring-amber-400/50 focus:border-amber-400/50" : "focus:ring-blue-400/50 focus:border-blue-400/50";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams?search=${encodeURIComponent(q)}&limit=10`);
        const json = await res.json();
        setResults((json.data || []).map((t: Record<string, unknown>) => ({
          id: t.id,
          name: t.name,
          organisation_name: t.organisation_name || "",
          season_name: t.season_name || "",
          wins: t.wins || 0,
          losses: t.losses || 0,
          games_played: t.games_played || 0,
        })));
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div ref={ref} className="flex-1 min-w-0">
      <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
      {selected ? (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg" style={{ color: accentColor }}>{selected.name}</div>
            <div className="text-sm text-slate-400">
              {selected.organisation_name}{selected.season_name ? ` · ${selected.season_name}` : ""}
            </div>
            <div className="text-xs text-slate-500 mt-1">{selected.wins}W-{selected.losses}L · {selected.games_played} GP</div>
          </div>
          <button
            onClick={() => { onSelect(null); setQuery(""); }}
            className="text-slate-500 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg hover:bg-slate-700"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value); setOpen(true); }}
              onFocus={() => query.length >= 2 && setOpen(true)}
              placeholder="Search team..."
              className={`w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${ringClass}`}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-500 border-t-blue-400 rounded-full animate-spin" />
            )}
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {results.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="font-medium text-white">{t.name}</div>
                  <div className="text-xs text-slate-400">
                    {t.organisation_name}{t.season_name ? ` · ${t.season_name}` : ""} · {t.wins}W-{t.losses}L
                  </div>
                </button>
              ))}
            </div>
          )}
          {open && query.length >= 2 && results.length === 0 && !loading && (
            <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 text-center text-slate-400 text-sm">
              No teams found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Donut Chart ───────────────────────────────────────────────── */

function WinProbabilityDonut({ team1Pct, team2Pct, team1Name, team2Name }: {
  team1Pct: number; team2Pct: number; team1Name: string; team2Name: string;
}) {
  const data = [
    { name: team1Name, value: team1Pct },
    { name: team2Name, value: team2Pct },
  ];

  return (
    <div className="relative w-64 h-64 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            <Cell fill={AMBER} />
            <Cell fill={BLUE} />
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "0.75rem", color: "#fff" }}
            formatter={(value) => `${value}%`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-black text-white">{team1Pct}%</div>
          <div className="text-xs text-slate-400 mt-1">Win Probability</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export default function PredictionsClient() {
  const [team1, setTeam1] = useState<TeamOption | null>(null);
  const [team2, setTeam2] = useState<TeamOption | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const runPrediction = useCallback(async () => {
    if (!team1 || !team2) return;
    setLoading(true);
    setResult(null);
    setErrMsg("");
    try {
      const res = await fetch(`/api/predictions/team-vs-team?team1=${team1.id}&team2=${team2.id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Prediction failed");
    }
    setLoading(false);
  }, [team1, team2]);

  const t1 = result?.team1;
  const t2 = result?.team2;
  const pred = result?.prediction;
  const h2h = result?.headToHead;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400 text-sm font-medium mb-4">
            <BarChart3 className="w-4 h-4" />
            Game Predictions
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Team vs Team Predictor
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Select two teams to predict game outcomes based on win-loss records, scoring power, roster depth, and head-to-head history.
          </p>
        </div>

        {/* Team Selection */}
        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <TeamSearchDropdown label="Team 1" selected={team1} onSelect={setTeam1} accent="amber" />
          <div className="hidden md:flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-2xl border border-slate-700 flex-shrink-0 mb-0.5">
            <span className="text-2xl font-black text-slate-500">VS</span>
          </div>
          <TeamSearchDropdown label="Team 2" selected={team2} onSelect={setTeam2} accent="blue" />
        </div>

        {/* Predict Button */}
        <div className="text-center mb-10">
          <button
            onClick={runPrediction}
            disabled={!team1 || !team2 || loading || team1?.id === team2?.id}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:shadow-none hover:shadow-amber-400/30 hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Predict Game
              </span>
            )}
          </button>
          {team1 && team2 && team1.id === team2.id && (
            <p className="text-red-400 text-sm mt-2">Select two different teams</p>
          )}
          {errMsg && <p className="text-red-400 text-sm mt-2">{errMsg}</p>}
        </div>

        {/* Results */}
        {result && t1 && t2 && pred && h2h && (
          <div className="space-y-6">
            {/* Win Probability Donut */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">
                Win Probability
              </h2>

              <WinProbabilityDonut
                team1Pct={pred.team1WinPct}
                team2Pct={pred.team2WinPct}
                team1Name={t1.name}
                team2Name={t2.name}
              />

              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: AMBER }} />
                  <span className="text-sm font-medium" style={{ color: AMBER }}>{t1.name}</span>
                  <span className="text-white font-bold">{pred.team1WinPct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: BLUE }} />
                  <span className="text-sm font-medium" style={{ color: BLUE }}>{t2.name}</span>
                  <span className="text-white font-bold">{pred.team2WinPct}%</span>
                </div>
              </div>

              {/* Winner */}
              <div className="text-center mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium text-slate-400">Predicted Winner</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {pred.team1WinPct >= pred.team2WinPct ? t1.name : t2.name}
                </div>
              </div>
            </div>

            {/* Key Matchup Factors */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">
                Key Matchup Factors
              </h2>
              <div className="space-y-4">
                {pred.factors.map((f) => (
                  <div key={f.label} className="flex items-center gap-4">
                    <div className="flex-1 text-right">
                      <span
                        className={`text-sm font-bold tabular-nums ${f.advantage === "team1" ? "text-amber-400" : "text-slate-400"}`}
                      >
                        {f.team1Value}
                      </span>
                    </div>
                    <div className="flex-shrink-0 w-36 text-center">
                      <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                        f.advantage === "team1"
                          ? "text-amber-400 bg-amber-400/10"
                          : f.advantage === "team2"
                          ? "text-blue-400 bg-blue-400/10"
                          : "text-slate-400 bg-slate-700/50"
                      }`}>
                        {f.label}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm font-bold tabular-nums ${f.advantage === "team2" ? "text-blue-400" : "text-slate-400"}`}
                      >
                        {f.team2Value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Head-to-Head Record */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">
                Head-to-Head Record
              </h2>
              {h2h.totalGames > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-black" style={{ color: AMBER }}>{h2h.team1Wins}</div>
                      <div className="text-xs text-slate-400 mt-1">{t1.name} wins</div>
                    </div>
                    <div className="text-slate-600 text-2xl font-bold">–</div>
                    <div className="text-center">
                      <div className="text-3xl font-black" style={{ color: BLUE }}>{h2h.team2Wins}</div>
                      <div className="text-xs text-slate-400 mt-1">{t2.name} wins</div>
                    </div>
                  </div>
                  {h2h.recentGames.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">Recent Meetings</h3>
                      <div className="space-y-2">
                        {h2h.recentGames.map((g, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2.5 text-sm"
                          >
                            <span className="text-slate-500 w-24">{g.date}</span>
                            <span className={`font-bold ${g.winner === "team1" ? "text-amber-400" : "text-slate-400"}`}>
                              {g.team1Score}
                            </span>
                            <span className="text-slate-600 mx-2">-</span>
                            <span className={`font-bold ${g.winner === "team2" ? "text-blue-400" : "text-slate-400"}`}>
                              {g.team2Score}
                            </span>
                            <span className={`text-xs font-medium w-16 text-right ${g.winner === "team1" ? "text-amber-400" : "text-blue-400"}`}>
                              {g.winner === "team1" ? t1.name.split(" ").pop() : t2.name.split(" ").pop()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-slate-500">No head-to-head games found between these teams.</p>
              )}
            </div>

            {/* Top Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { team: t1, color: AMBER, bg: AMBER_BG, label: "Team 1" },
                { team: t2, color: BLUE, bg: BLUE_BG, label: "Team 2" },
              ].map(({ team, color, bg }) => (
                <div key={team.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4" style={{ color }} />
                    <h3 className="font-bold" style={{ color }}>{team.name}</h3>
                  </div>
                  <div className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Top Players</div>
                  {team.topPlayers.length > 0 ? (
                    <div className="space-y-2">
                      {team.topPlayers.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: i === 0 ? bg : undefined }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-5">{i + 1}</span>
                            <span className="text-sm font-medium text-white">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-sm font-bold" style={{ color }}>{p.ppg}</span>
                              <span className="text-xs text-slate-500 ml-1">PPG</span>
                            </div>
                            <span className="text-xs text-slate-500">{p.games}G</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No player data available</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
