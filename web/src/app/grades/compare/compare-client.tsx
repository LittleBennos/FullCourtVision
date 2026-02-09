"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, ArrowLeftRight, TrendingUp, Users, Gamepad2, Target } from "lucide-react";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

type GradeSearchResult = {
  id: string;
  name: string;
  type: string | null;
  season_name: string;
  competition_name: string;
};

type GradeCompareData = {
  id: string;
  name: string;
  type: string | null;
  season_name: string;
  competition_name: string;
  org_name: string;
  totalPlayers: number;
  totalGames: number;
  totalTeams: number;
  avgPPG: number;
  avgFouls: number;
  avgGameScore: number;
  topScorer: { name: string; points: number; games: number } | null;
  competitivenessIndex: number;
};

function GradeSelector({
  label,
  selected,
  onSelect,
  onClear,
}: {
  label: string;
  selected: GradeSearchResult | null;
  onSelect: (g: GradeSearchResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GradeSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback((q: string) => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/grades/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    }, 300);
  }, []);

  if (selected) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">{label}</span>
          <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="font-semibold text-white text-lg">{selected.name}</p>
        <p className="text-sm text-slate-400">{selected.competition_name}</p>
        <p className="text-xs text-slate-500">{selected.season_name}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">{label}</span>
        <div className="flex items-center gap-2 mt-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search grades..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); setOpen(true); }}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            className="bg-transparent text-white placeholder-slate-500 outline-none w-full text-sm"
          />
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          {results.map((g) => (
            <button
              key={g.id}
              onClick={() => { onSelect(g); setOpen(false); setQuery(""); setResults([]); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
            >
              <p className="text-sm font-medium text-white">{g.name}</p>
              <p className="text-xs text-slate-400">{g.competition_name} · {g.season_name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value1, value2, icon: Icon, highlight }: {
  label: string;
  value1: string | number;
  value2: string | number;
  icon: React.ElementType;
  highlight?: "higher" | "lower";
}) {
  const v1 = typeof value1 === "number" ? value1 : parseFloat(value1) || 0;
  const v2 = typeof value2 === "number" ? value2 : parseFloat(value2) || 0;
  const better1 = highlight === "lower" ? v1 < v2 : v1 > v2;
  const better2 = highlight === "lower" ? v2 < v1 : v2 > v1;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`text-2xl font-bold tabular-nums ${better1 ? "text-blue-400" : "text-white"}`}>
          {value1}
        </div>
        <div className={`text-2xl font-bold tabular-nums text-right ${better2 ? "text-blue-400" : "text-white"}`}>
          {value2}
        </div>
      </div>
    </div>
  );
}

export default function GradeCompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grade1, setGrade1] = useState<GradeSearchResult | null>(null);
  const [grade2, setGrade2] = useState<GradeSearchResult | null>(null);
  const [data1, setData1] = useState<GradeCompareData | null>(null);
  const [data2, setData2] = useState<GradeCompareData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load from URL params
  useEffect(() => {
    const g1 = searchParams.get("g1");
    const g2 = searchParams.get("g2");
    if (g1 && !grade1) {
      fetch(`/api/grades/compare?id=${g1}`).then(r => r.json()).then(d => {
        if (d.id) {
          setGrade1({ id: d.id, name: d.name, type: d.type, season_name: d.season_name, competition_name: d.competition_name });
          setData1(d);
        }
      });
    }
    if (g2 && !grade2) {
      fetch(`/api/grades/compare?id=${g2}`).then(r => r.json()).then(d => {
        if (d.id) {
          setGrade2({ id: d.id, name: d.name, type: d.type, season_name: d.season_name, competition_name: d.competition_name });
          setData2(d);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async (id: string, setter: (d: GradeCompareData) => void) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grades/compare?id=${id}`);
      const data = await res.json();
      if (data.id) setter(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUrl = useCallback((g1Id: string | null, g2Id: string | null) => {
    const params = new URLSearchParams();
    if (g1Id) params.set("g1", g1Id);
    if (g2Id) params.set("g2", g2Id);
    const qs = params.toString();
    router.replace(`/grades/compare${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router]);

  const selectGrade1 = (g: GradeSearchResult) => {
    setGrade1(g);
    fetchData(g.id, setData1);
    updateUrl(g.id, grade2?.id || null);
  };
  const selectGrade2 = (g: GradeSearchResult) => {
    setGrade2(g);
    fetchData(g.id, setData2);
    updateUrl(grade1?.id || null, g.id);
  };

  const swap = () => {
    setGrade1(grade2);
    setGrade2(grade1);
    setData1(data2);
    setData2(data1);
    updateUrl(grade2?.id || null, grade1?.id || null);
  };

  const radarData = data1 && data2 ? [
    { metric: "Avg PPG", A: data1.avgPPG, B: data2.avgPPG },
    { metric: "Players", A: data1.totalPlayers, B: data2.totalPlayers },
    { metric: "Games", A: data1.totalGames, B: data2.totalGames },
    { metric: "Teams", A: data1.totalTeams, B: data2.totalTeams },
    { metric: "Avg Game Score", A: data1.avgGameScore, B: data2.avgGameScore },
    { metric: "Competitiveness", A: +(1 - data1.competitivenessIndex).toFixed(3), B: +(1 - data2.competitivenessIndex).toFixed(3) },
  ] : [];

  // Normalize radar data to 0-100 scale
  const normalizedRadar = radarData.map(d => {
    const max = Math.max(d.A, d.B, 1);
    return { metric: d.metric, A: +(d.A / max * 100).toFixed(1), B: +(d.B / max * 100).toFixed(1) };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Grade Comparison</h1>
        <p className="text-slate-400">Compare two grades side by side across key metrics</p>
      </div>

      {/* Grade Selectors */}
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-8">
        <GradeSelector
          label="Grade A"
          selected={grade1}
          onSelect={selectGrade1}
          onClear={() => { setGrade1(null); setData1(null); updateUrl(null, grade2?.id || null); }}
        />
        <button
          onClick={swap}
          disabled={!grade1 && !grade2}
          className="self-center p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-400/50 transition-colors disabled:opacity-30"
        >
          <ArrowLeftRight className="w-5 h-5" />
        </button>
        <GradeSelector
          label="Grade B"
          selected={grade2}
          onSelect={selectGrade2}
          onClear={() => { setGrade2(null); setData2(null); updateUrl(grade1?.id || null, null); }}
        />
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Comparison */}
      {data1 && data2 && !loading && (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Avg PPG (per player)" value1={data1.avgPPG} value2={data2.avgPPG} icon={Target} />
            <StatCard label="Avg Fouls (per player)" value1={data1.avgFouls} value2={data2.avgFouls} icon={Target} highlight="lower" />
            <StatCard label="Total Players" value1={data1.totalPlayers} value2={data2.totalPlayers} icon={Users} />
            <StatCard label="Total Games" value1={data1.totalGames} value2={data2.totalGames} icon={Gamepad2} />
            <StatCard label="Teams" value1={data1.totalTeams} value2={data2.totalTeams} icon={Users} />
            <StatCard label="Avg Game Score" value1={data1.avgGameScore} value2={data2.avgGameScore} icon={Target} />
          </div>

          {/* Grade Names Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <Link href={`/grades/${data1.id}`} className="text-blue-400 hover:underline font-semibold">
                {data1.name}
              </Link>
            </div>
            <div className="text-center">
              <Link href={`/grades/${data2.id}`} className="text-blue-400 hover:underline font-semibold">
                {data2.name}
              </Link>
            </div>
          </div>

          {/* Top Scorers */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-blue-400 uppercase tracking-wider font-medium mb-2">Top Scorer</p>
              {data1.topScorer ? (
                <>
                  <p className="font-semibold text-white">{data1.topScorer.name}</p>
                  <p className="text-sm text-slate-400">{data1.topScorer.points} pts · {data1.topScorer.games} games</p>
                </>
              ) : <p className="text-slate-500 text-sm">No data</p>}
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-blue-400 uppercase tracking-wider font-medium mb-2">Top Scorer</p>
              {data2.topScorer ? (
                <>
                  <p className="font-semibold text-white">{data2.topScorer.name}</p>
                  <p className="text-sm text-slate-400">{data2.topScorer.points} pts · {data2.topScorer.games} games</p>
                </>
              ) : <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>

          {/* Competitiveness Index */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">Competitiveness Index</span>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{data1.competitivenessIndex}</p>
              <p className="text-xs text-slate-500 mt-1">Lower = more competitive (std dev of win %)</p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">Competitiveness Index</span>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{data2.competitivenessIndex}</p>
              <p className="text-xs text-slate-500 mt-1">Lower = more competitive (std dev of win %)</p>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Grade Comparison Radar</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={normalizedRadar} cx="50%" cy="50%" outerRadius="80%">
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar
                    name={data1.name}
                    dataKey="A"
                    stroke="#60a5fa"
                    fill="#60a5fa"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Radar
                    name={data2.name}
                    dataKey="B"
                    stroke="#f472b6"
                    fill="#f472b6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Legend
                    wrapperStyle={{ color: "#94a3b8", fontSize: 13 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!data1 && !data2 && !loading && (
        <div className="text-center py-16 text-slate-500">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select two grades to compare</p>
          <p className="text-sm mt-1">Search by grade name above</p>
        </div>
      )}
    </div>
  );
}
