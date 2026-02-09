"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Trophy,
  TrendingUp,
  Target,
  BarChart3,
  Percent,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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

interface TeamStats {
  id: string;
  name: string;
  seasonId: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  offensivePpg: number;
  defensivePpgAllowed: number;
  recentFormWins: number;
  recentFormGames: number;
  threePtPct: number;
  threePtMade: number;
  threePtAttempted: number;
}

interface Factor {
  key: string;
  label: string;
  weight: number;
  team1Value: number | string;
  team2Value: number | string;
  team1Score: number;
  team2Score: number;
  advantage: "team1" | "team2" | "even";
}

interface H2HGame {
  date: string;
  team1Score: number;
  team2Score: number;
  winner: "team1" | "team2";
}

interface WinProbResult {
  team1: TeamStats;
  team2: TeamStats;
  headToHead: {
    team1Wins: number;
    team2Wins: number;
    totalGames: number;
    recentGames: H2HGame[];
  };
  probability: {
    team1Pct: number;
    team2Pct: number;
    factors: Factor[];
    confidence: "low" | "medium" | "high";
  };
}

/* ── Colors ────────────────────────────────────────────────────── */

const AMBER = "#f59e0b";
const BLUE = "#3b82f6";

/* ── Team Search Dropdown (reused pattern) ─────────────────────── */

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
  const ringClass =
    accent === "amber"
      ? "focus:ring-amber-400/50 focus:border-amber-400/50"
      : "focus:ring-blue-400/50 focus:border-blue-400/50";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/teams?search=${encodeURIComponent(q)}&limit=15`
        );
        const json = await res.json();
        setResults(
          (json.data || []).map((t: Record<string, unknown>) => ({
            id: t.id,
            name: t.name,
            organisation_name: t.organisation_name || "",
            season_name: t.season_name || "",
            wins: t.wins || 0,
            losses: t.losses || 0,
            games_played: t.games_played || 0,
          }))
        );
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  }, []);

  // Group results by organisation
  const grouped = results.reduce<Record<string, TeamOption[]>>((acc, t) => {
    const org = t.organisation_name || "Other";
    if (!acc[org]) acc[org] = [];
    acc[org].push(t);
    return acc;
  }, {});

  return (
    <div ref={ref} className="flex-1 min-w-0">
      <label className="block text-sm font-medium text-slate-400 mb-2">
        {label}
      </label>
      {selected ? (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg" style={{ color: accentColor }}>
              {selected.name}
            </div>
            <div className="text-sm text-slate-400">
              {selected.organisation_name}
              {selected.season_name ? ` · ${selected.season_name}` : ""}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {selected.wins}W-{selected.losses}L · {selected.games_played} GP
            </div>
          </div>
          <button
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
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
              onChange={(e) => {
                setQuery(e.target.value);
                search(e.target.value);
                setOpen(true);
              }}
              onFocus={() => query.length >= 2 && setOpen(true)}
              placeholder="Search team..."
              className={`w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${ringClass}`}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-500 border-t-blue-400 rounded-full animate-spin" />
            )}
          </div>
          {open && Object.keys(grouped).length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([org, teams]) => (
                <div key={org}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
                    {org}
                  </div>
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelect(t);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-xs text-slate-400">
                        {t.season_name ? `${t.season_name} · ` : ""}
                        {t.wins}W-{t.losses}L
                      </div>
                    </button>
                  ))}
                </div>
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

/* ── Animated Probability Gauge ────────────────────────────────── */

function ProbabilityGauge({
  team1Pct,
  team2Pct,
  team1Name,
  team2Name,
}: {
  team1Pct: number;
  team2Pct: number;
  team1Name: string;
  team2Name: string;
}) {
  const [animPct, setAnimPct] = useState(50);

  useEffect(() => {
    // Animate from 50 to actual value
    setAnimPct(50);
    const timer = setTimeout(() => setAnimPct(team1Pct), 100);
    return () => clearTimeout(timer);
  }, [team1Pct]);

  const data = [
    { name: team1Name, value: animPct },
    { name: team2Name, value: 100 - animPct },
  ];

  return (
    <div className="relative w-72 h-72 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            <Cell fill={AMBER} />
            <Cell fill={BLUE} />
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.75rem",
              color: "#fff",
            }}
            formatter={(value) => `${value}%`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-4xl font-black text-white tabular-nums">
            {team1Pct}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Win Probability</div>
        </div>
      </div>
    </div>
  );
}

/* ── Factor Breakdown Bar ──────────────────────────────────────── */

function FactorBar({
  factor,
  team1Name,
  team2Name,
}: {
  factor: Factor;
  team1Name: string;
  team2Name: string;
}) {
  const t1Width = Math.max(5, factor.team1Score);
  const t2Width = 100 - t1Width;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 font-medium">
          {factor.label}{" "}
          <span className="text-slate-600 text-xs">
            ({(factor.weight * 100).toFixed(0)}%)
          </span>
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            factor.advantage === "team1"
              ? "text-amber-400 bg-amber-400/10"
              : factor.advantage === "team2"
              ? "text-blue-400 bg-blue-400/10"
              : "text-slate-400 bg-slate-700/50"
          }`}
        >
          {factor.advantage === "team1"
            ? `${team1Name} edge`
            : factor.advantage === "team2"
            ? `${team2Name} edge`
            : "Even"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-400 font-bold w-16 text-right tabular-nums">
          {factor.team1Value}
        </span>
        <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full rounded-l-full transition-all duration-700"
            style={{ width: `${t1Width}%`, background: AMBER }}
          />
          <div
            className="h-full rounded-r-full transition-all duration-700"
            style={{ width: `${t2Width}%`, background: BLUE }}
          />
        </div>
        <span className="text-xs text-blue-400 font-bold w-16 tabular-nums">
          {factor.team2Value}
        </span>
      </div>
    </div>
  );
}

/* ── Confidence Badge ──────────────────────────────────────────── */

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: {
      icon: AlertTriangle,
      label: "Low Confidence",
      desc: "Few games played — prediction may be unreliable",
      color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    medium: {
      icon: HelpCircle,
      label: "Medium Confidence",
      desc: "Moderate sample size — reasonable prediction",
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    high: {
      icon: CheckCircle2,
      label: "High Confidence",
      desc: "Strong sample size — reliable prediction",
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
  };
  const c = config[level];
  const Icon = c.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${c.color}`}
    >
      <Icon className="w-4 h-4" />
      <span>{c.label}</span>
      <span className="text-xs opacity-60">— {c.desc}</span>
    </div>
  );
}

/* ── What-If Sliders ───────────────────────────────────────────── */

function WhatIfSliders({
  factors,
  weights,
  onWeightsChange,
  onReset,
}: {
  factors: Factor[];
  weights: Record<string, number>;
  onWeightsChange: (w: Record<string, number>) => void;
  onReset: () => void;
}) {
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <SlidersHorizontal className="w-4 h-4" />
          Adjust factor weights to see how the probability shifts
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
      {factors.map((f) => (
        <div key={f.key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{f.label}</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {((weights[f.key] / (totalWeight || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[f.key]}
            onChange={(e) =>
              onWeightsChange({
                ...weights,
                [f.key]: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-400
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>
      ))}
      {Math.abs(totalWeight) < 0.01 && (
        <p className="text-xs text-red-400">
          All weights are zero — adjust at least one factor
        </p>
      )}
    </div>
  );
}

/* ── Recalculate with custom weights ───────────────────────────── */

function recalcWithWeights(
  factors: Factor[],
  weights: Record<string, number>
): { team1Pct: number; team2Pct: number } {
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return { team1Pct: 50, team2Pct: 50 };

  let rawProb = 0;
  for (const f of factors) {
    const w = weights[f.key] / totalWeight;
    rawProb += (f.team1Score / 100) * w;
  }

  const team1Pct = Math.max(5, Math.min(95, Math.round(rawProb * 100)));
  return { team1Pct, team2Pct: 100 - team1Pct };
}

/* ── Main Component ────────────────────────────────────────────── */

export default function WinProbabilityClient() {
  const [team1, setTeam1] = useState<TeamOption | null>(null);
  const [team2, setTeam2] = useState<TeamOption | null>(null);
  const [result, setResult] = useState<WinProbResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // What-if weights
  const defaultWeights: Record<string, number> = {
    offensive_ppg: 30,
    defensive_ppg: 25,
    head_to_head: 20,
    recent_form: 15,
    three_pt: 10,
  };
  const [weights, setWeights] = useState(defaultWeights);
  const [showWhatIf, setShowWhatIf] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!team1 || !team2) return;
    setLoading(true);
    setResult(null);
    setErrMsg("");
    setWeights(defaultWeights);
    try {
      const res = await fetch(
        `/api/analytics/win-probability?team1=${team1.id}&team2=${team2.id}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Analysis failed");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team1, team2]);

  const prob = result?.probability;
  const h2h = result?.headToHead;
  const t1 = result?.team1;
  const t2 = result?.team2;

  // Recompute if weights changed
  const adjusted =
    prob && weights
      ? recalcWithWeights(prob.factors, weights)
      : null;

  const displayT1Pct = adjusted?.team1Pct ?? prob?.team1Pct ?? 50;
  const displayT2Pct = adjusted?.team2Pct ?? prob?.team2Pct ?? 50;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400 text-sm font-medium mb-4">
            <Percent className="w-4 h-4" />
            Win Probability Model
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Win Probability Model
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Calculate win probabilities using weighted factors: offensive PPG,
            defensive efficiency, head-to-head record, recent form, and 3PT
            shooting. Adjust the weights to explore &ldquo;what if&rdquo;
            scenarios.
          </p>
        </div>

        {/* Team Selection */}
        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <TeamSearchDropdown
            label="Team 1"
            selected={team1}
            onSelect={setTeam1}
            accent="amber"
          />
          <div className="hidden md:flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-2xl border border-slate-700 flex-shrink-0 mb-0.5">
            <span className="text-2xl font-black text-slate-500">VS</span>
          </div>
          <TeamSearchDropdown
            label="Team 2"
            selected={team2}
            onSelect={setTeam2}
            accent="blue"
          />
        </div>

        {/* Analyze Button */}
        <div className="text-center mb-10">
          <button
            onClick={runAnalysis}
            disabled={!team1 || !team2 || loading || team1?.id === team2?.id}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:shadow-none hover:shadow-amber-400/30 hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Calculating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Calculate Win Probability
              </span>
            )}
          </button>
          {team1 && team2 && team1.id === team2.id && (
            <p className="text-red-400 text-sm mt-2">
              Select two different teams
            </p>
          )}
          {errMsg && <p className="text-red-400 text-sm mt-2">{errMsg}</p>}
        </div>

        {/* Results */}
        {result && t1 && t2 && prob && h2h && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Confidence Badge */}
            <div className="text-center">
              <ConfidenceBadge level={prob.confidence} />
            </div>

            {/* Probability Gauge */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">
                Win Probability
              </h2>

              <ProbabilityGauge
                team1Pct={displayT1Pct}
                team2Pct={displayT2Pct}
                team1Name={t1.name}
                team2Name={t2.name}
              />

              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: AMBER }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: AMBER }}
                  >
                    {t1.name}
                  </span>
                  <span className="text-white font-bold tabular-nums">
                    {displayT1Pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: BLUE }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: BLUE }}
                  >
                    {t2.name}
                  </span>
                  <span className="text-white font-bold tabular-nums">
                    {displayT2Pct}%
                  </span>
                </div>
              </div>

              {/* Winner */}
              <div className="text-center mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium text-slate-400">
                    Predicted Winner
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  {displayT1Pct >= displayT2Pct ? t1.name : t2.name}
                </div>
              </div>
            </div>

            {/* Factor Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-2 tracking-wider uppercase">
                Factor Breakdown
              </h2>
              <div className="flex items-center justify-center gap-6 mb-6 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: AMBER }}
                  />
                  {t1.name}
                </span>
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: BLUE }}
                  />
                  {t2.name}
                </span>
              </div>
              <div className="space-y-5">
                {prob.factors.map((f) => (
                  <FactorBar
                    key={f.key}
                    factor={f}
                    team1Name={t1.name}
                    team2Name={t2.name}
                  />
                ))}
              </div>
            </div>

            {/* Head-to-Head History */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-center text-lg font-bold text-slate-300 mb-6 tracking-wider uppercase">
                Head-to-Head History
              </h2>
              {h2h.totalGames > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <div
                        className="text-3xl font-black"
                        style={{ color: AMBER }}
                      >
                        {h2h.team1Wins}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {t1.name} wins
                      </div>
                    </div>
                    <div className="text-slate-600 text-2xl font-bold">–</div>
                    <div className="text-center">
                      <div
                        className="text-3xl font-black"
                        style={{ color: BLUE }}
                      >
                        {h2h.team2Wins}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {t2.name} wins
                      </div>
                    </div>
                  </div>
                  {h2h.recentGames.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">
                        Recent Meetings
                      </h3>
                      <div className="space-y-2">
                        {h2h.recentGames.slice(0, 5).map((g, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2.5 text-sm"
                          >
                            <span className="text-slate-500 w-24">
                              {g.date}
                            </span>
                            <span
                              className={`font-bold ${
                                g.winner === "team1"
                                  ? "text-amber-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {g.team1Score}
                            </span>
                            <span className="text-slate-600 mx-2">-</span>
                            <span
                              className={`font-bold ${
                                g.winner === "team2"
                                  ? "text-blue-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {g.team2Score}
                            </span>
                            <span
                              className={`text-xs font-medium w-20 text-right ${
                                g.winner === "team1"
                                  ? "text-amber-400"
                                  : "text-blue-400"
                              }`}
                            >
                              {g.winner === "team1"
                                ? t1.name.split(" ").pop()
                                : t2.name.split(" ").pop()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-slate-500">
                  No head-to-head games found between these teams.
                </p>
              )}
            </div>

            {/* What-If Sliders */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8">
              <button
                onClick={() => setShowWhatIf(!showWhatIf)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                  What If?
                </h2>
                <span className="text-sm text-slate-500">
                  {showWhatIf ? "Hide" : "Show"} sliders
                </span>
              </button>
              {showWhatIf && (
                <div className="mt-6">
                  <WhatIfSliders
                    factors={prob.factors}
                    weights={weights}
                    onWeightsChange={setWeights}
                    onReset={() => setWeights(defaultWeights)}
                  />
                </div>
              )}
            </div>

            {/* Team Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { team: t1, color: AMBER, label: "Team 1" },
                { team: t2, color: BLUE, label: "Team 2" },
              ].map(({ team, color }) => (
                <div
                  key={team.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6"
                >
                  <h3 className="font-bold text-lg mb-4" style={{ color }}>
                    {team.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">Record</div>
                      <div className="font-bold text-white">
                        {team.wins}W-{team.losses}L
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">
                        Offensive PPG
                      </div>
                      <div className="font-bold text-white">
                        {team.offensivePpg}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">
                        Defensive PPG
                      </div>
                      <div className="font-bold text-white">
                        {team.defensivePpgAllowed}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">Recent Form</div>
                      <div className="font-bold text-white">
                        {team.recentFormWins}-
                        {team.recentFormGames - team.recentFormWins} (L5)
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">3PT/Game</div>
                      <div className="font-bold text-white">
                        {team.threePtPct}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs">
                        Games Played
                      </div>
                      <div className="font-bold text-white">
                        {team.gamesPlayed}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
