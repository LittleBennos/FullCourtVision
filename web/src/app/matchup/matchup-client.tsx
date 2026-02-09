"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Swords, Trophy, TrendingUp, Shield, Zap } from "lucide-react";

interface PlayerOption {
  id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  ppg: number;
}

interface PlayerStats {
  id: string;
  name: string;
  games: number;
  ppg: number;
  threePtPg: number;
  twoPtPg: number;
  foulsPg: number;
  efficiency: number;
  archetype: string;
}

interface MatchupResult {
  player1: PlayerStats;
  player2: PlayerStats;
  prediction: {
    player1WinPct: number;
    player2WinPct: number;
    winner: string;
    archetypeAnalysis: string;
    factors: {
      ppgAdvantage: string;
      efficiencyAdvantage: string;
      experienceAdvantage: string;
      archetypeAdvantage: string;
    };
  };
}

const ARCHETYPE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  "Sharpshooter": { icon: "🎯", color: "#ffc300", bg: "rgba(255,195,0,0.15)" },
  "Inside Scorer": { icon: "💪", color: "#e94560", bg: "rgba(233,69,96,0.15)" },
  "High Volume": { icon: "🔥", color: "#00d2ff", bg: "rgba(0,210,255,0.15)" },
  "Physical": { icon: "🛡️", color: "#7b2ff7", bg: "rgba(123,47,247,0.15)" },
  "Balanced": { icon: "⚖️", color: "#2ecc71", bg: "rgba(46,204,113,0.15)" },
};

function PlayerSearchDropdown({
  label,
  selected,
  onSelect,
  side,
}: {
  label: string;
  selected: PlayerOption | null;
  onSelect: (p: PlayerOption) => void;
  side: "left" | "right";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

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
        const res = await fetch(`/api/players?search=${encodeURIComponent(q)}&limit=10`);
        const json = await res.json();
        setResults(json.data || []);
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
            <div className="font-bold text-white text-lg">{selected.first_name} {selected.last_name}</div>
            <div className="text-sm text-slate-400">{selected.total_games} games · {selected.ppg} PPG</div>
          </div>
          <button
            onClick={() => { onSelect(null as unknown as PlayerOption); setQuery(""); }}
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
              placeholder="Search player..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-500 border-t-blue-400 rounded-full animate-spin" />
            )}
          </div>
          {open && results.length > 0 && (
            <div className={`absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto ${side === "right" ? "right-0" : "left-0"}`}>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="font-medium text-white">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-slate-400">{p.total_games} games · {p.ppg} PPG</div>
                </button>
              ))}
            </div>
          )}
          {open && query.length >= 2 && results.length === 0 && !loading && (
            <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 text-center text-slate-400 text-sm">
              No players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBar({ label, v1, v2, icon }: { label: string; v1: number; v2: number; icon?: React.ReactNode }) {
  const max = Math.max(v1, v2, 0.1);
  const p1Width = (v1 / max) * 100;
  const p2Width = (v2 / max) * 100;
  const p1Better = v1 > v2;
  const p2Better = v2 > v1;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-bold tabular-nums ${p1Better ? "text-blue-400" : "text-slate-400"}`}>{v1}</span>
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">{icon}{label}</span>
        <span className={`text-sm font-bold tabular-nums ${p2Better ? "text-red-400" : "text-slate-400"}`}>{v2}</span>
      </div>
      <div className="flex gap-1 h-3">
        <div className="flex-1 flex justify-end">
          <div
            className={`h-full rounded-l-full transition-all duration-1000 ease-out ${p1Better ? "bg-blue-400" : "bg-slate-600"}`}
            style={{ width: `${p1Width}%` }}
          />
        </div>
        <div className="flex-1">
          <div
            className={`h-full rounded-r-full transition-all duration-1000 ease-out ${p2Better ? "bg-red-400" : "bg-slate-600"}`}
            style={{ width: `${p2Width}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function WinProbabilityBar({ pct, name, side }: { pct: number; name: string; side: "left" | "right" }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="flex-1">
        <div className="h-8 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1500 ease-out flex items-center ${
              side === "left" ? "bg-gradient-to-r from-blue-500 to-blue-400 justify-end pr-3" : "bg-gradient-to-l from-red-500 to-red-400 justify-start pl-3"
            }`}
            style={{ width: `${animated}%` }}
          >
            {animated >= 20 && (
              <span className="text-white text-sm font-bold">{animated}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchupClient() {
  const [player1, setPlayer1] = useState<PlayerOption | null>(null);
  const [player2, setPlayer2] = useState<PlayerOption | null>(null);
  const [result, setResult] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const runMatchup = useCallback(async () => {
    if (!player1 || !player2) return;
    setLoading(true);
    setShowResult(false);
    setResult(null);
    try {
      const res = await fetch(`/api/matchup?player1=${player1.id}&player2=${player2.id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      // Delay showing results for VS animation
      setTimeout(() => setShowResult(true), 800);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [player1, player2]);

  const p1 = result?.player1;
  const p2 = result?.player2;
  const pred = result?.prediction;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-400/10 border border-blue-400/20 rounded-full text-blue-400 text-sm font-medium mb-4">
            <Swords className="w-4 h-4" />
            Player Matchup Predictor
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Head-to-Head Predictor
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Select two players to predict a head-to-head matchup outcome based on archetypes, scoring, efficiency, and experience.
          </p>
        </div>

        {/* Player Selection */}
        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <PlayerSearchDropdown label="Player 1" selected={player1} onSelect={setPlayer1} side="left" />
          <div className="hidden md:flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-2xl border border-slate-700 flex-shrink-0 mb-0.5">
            <span className="text-2xl font-black text-slate-500">VS</span>
          </div>
          <PlayerSearchDropdown label="Player 2" selected={player2} onSelect={setPlayer2} side="right" />
        </div>

        {/* Predict Button */}
        <div className="text-center mb-10">
          <button
            onClick={runMatchup}
            disabled={!player1 || !player2 || loading || player1?.id === player2?.id}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:shadow-none hover:shadow-blue-400/30 hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Predict Matchup
              </span>
            )}
          </button>
          {player1 && player2 && player1.id === player2.id && (
            <p className="text-red-400 text-sm mt-2">Select two different players</p>
          )}
        </div>

        {/* VS Animation */}
        {result && !showResult && (
          <div className="flex items-center justify-center py-20 animate-pulse">
            <div className="text-center">
              <div className="text-6xl font-black text-blue-400 animate-bounce">VS</div>
              <p className="text-slate-500 mt-4">Calculating matchup...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && showResult && p1 && p2 && pred && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tale of the Tape Header */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">Tale of the Tape</h2>

              {/* Player names + archetypes */}
              <div className="flex items-center justify-between mb-8">
                <div className="text-center flex-1">
                  <div className="text-xl md:text-2xl font-bold text-white mb-2">{p1.name}</div>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ color: ARCHETYPE_STYLES[p1.archetype]?.color, backgroundColor: ARCHETYPE_STYLES[p1.archetype]?.bg }}
                  >
                    {ARCHETYPE_STYLES[p1.archetype]?.icon} {p1.archetype}
                  </span>
                </div>
                <div className="flex-shrink-0 mx-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-red-500/20 border border-slate-700 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-xl md:text-2xl font-bold text-white mb-2">{p2.name}</div>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ color: ARCHETYPE_STYLES[p2.archetype]?.color, backgroundColor: ARCHETYPE_STYLES[p2.archetype]?.bg }}
                  >
                    {ARCHETYPE_STYLES[p2.archetype]?.icon} {p2.archetype}
                  </span>
                </div>
              </div>

              {/* Stat Comparison Bars */}
              <StatBar label="PPG" v1={p1.ppg} v2={p2.ppg} icon={<TrendingUp className="w-3 h-3" />} />
              <StatBar label="3PT/G" v1={p1.threePtPg} v2={p2.threePtPg} icon={<Zap className="w-3 h-3" />} />
              <StatBar label="2PT/G" v1={p1.twoPtPg} v2={p2.twoPtPg} icon={<Trophy className="w-3 h-3" />} />
              <StatBar label="Fouls/G" v1={p1.foulsPg} v2={p2.foulsPg} icon={<Shield className="w-3 h-3" />} />
              <StatBar label="Games" v1={p1.games} v2={p2.games} />
              <StatBar label="Efficiency" v1={p1.efficiency} v2={p2.efficiency} />
            </div>

            {/* Win Probability */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">Win Probability</h2>

              <div className="flex items-center gap-4 mb-4">
                <div className="text-right flex-shrink-0 w-24 md:w-32">
                  <div className="text-sm font-medium text-blue-400 truncate">{p1.name.split(" ")[0]}</div>
                  <div className="text-2xl font-black text-blue-400">{pred.player1WinPct}%</div>
                </div>
                <div className="flex-1 h-10 bg-slate-800 rounded-full overflow-hidden flex">
                  <WinProbabilityBar pct={pred.player1WinPct} name={p1.name} side="left" />
                  <WinProbabilityBar pct={pred.player2WinPct} name={p2.name} side="right" />
                </div>
                <div className="flex-shrink-0 w-24 md:w-32">
                  <div className="text-sm font-medium text-red-400 truncate">{p2.name.split(" ")[0]}</div>
                  <div className="text-2xl font-black text-red-400">{pred.player2WinPct}%</div>
                </div>
              </div>

              {/* Winner */}
              <div className="text-center mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium text-slate-400">Predicted Winner</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {pred.winner === p1.id ? p1.name : p2.name}
                </div>
              </div>
            </div>

            {/* Archetype Analysis */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-4 tracking-wider uppercase">Archetype Analysis</h2>
              <p className="text-center text-slate-300 leading-relaxed">{pred.archetypeAnalysis}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                  { label: "Scoring", value: pred.factors.ppgAdvantage },
                  { label: "Efficiency", value: pred.factors.efficiencyAdvantage },
                  { label: "Experience", value: pred.factors.experienceAdvantage },
                  { label: "Archetype", value: pred.factors.archetypeAdvantage },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">{f.label} Edge</div>
                    <div className="text-sm font-bold text-white truncate">{f.value.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
