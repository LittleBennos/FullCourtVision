"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Search, X, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

type PlayerSummary = { id: string; first_name: string; last_name: string };

type PlayerStats = {
  id: string;
  first_name: string;
  last_name: string;
  games_played: number;
  total_points: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
};

type CompareRow = {
  label: string;
  key: string;
  p1: number;
  p2: number;
  perGame?: boolean;
};

async function searchPlayers(query: string): Promise<PlayerSummary[]> {
  if (query.length < 2) return [];
  const { data } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);
  return (data || []) as PlayerSummary[];
}

async function getPlayerStats(id: string): Promise<PlayerStats | null> {
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", id)
    .single();
  if (!player) return null;

  const { data: stats } = await supabase
    .from("player_stats")
    .select("games_played, total_points, one_point, two_point, three_point, total_fouls")
    .eq("player_id", id);

  const agg = (stats || []).reduce(
    (acc, s) => ({
      games_played: acc.games_played + (s.games_played || 0),
      total_points: acc.total_points + (s.total_points || 0),
      one_point: acc.one_point + (s.one_point || 0),
      two_point: acc.two_point + (s.two_point || 0),
      three_point: acc.three_point + (s.three_point || 0),
      total_fouls: acc.total_fouls + (s.total_fouls || 0),
    }),
    { games_played: 0, total_points: 0, one_point: 0, two_point: 0, three_point: 0, total_fouls: 0 }
  );

  return { id: player.id, first_name: player.first_name, last_name: player.last_name, ...agg };
}

function PlayerSearch({
  slot,
  selected,
  onSelect,
  onClear,
}: {
  slot: number;
  selected: PlayerStats | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.length >= 2) {
        const r = await searchPlayers(query);
        setResults(r);
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (selected) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Player {slot}</p>
          <Link href={`/players/${selected.id}`} className="text-xl font-bold hover:text-accent transition-colors">
            {selected.first_name} {selected.last_name}
          </Link>
        </div>
        <button onClick={onClear} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-xs text-muted-foreground mb-2">Player {slot}</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search player name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-muted/50 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {p.first_name} {p.last_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonBar({ row, color1, color2 }: { row: CompareRow; color1: string; color2: string }) {
  const max = Math.max(row.p1, row.p2, 1);
  const p1Pct = (row.p1 / max) * 100;
  const p2Pct = (row.p2 / max) * 100;
  const p1Leads = row.p1 > row.p2;
  const p2Leads = row.p2 > row.p1;
  const isFouls = row.key === "fouls" || row.key === "fpg";
  // For fouls, lower is better
  const p1Better = isFouls ? row.p1 < row.p2 : p1Leads;
  const p2Better = isFouls ? row.p2 < row.p1 : p2Leads;

  return (
    <div className="py-3">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-semibold tabular-nums ${p1Better ? "text-blue-400" : "text-muted-foreground"}`}>
          {row.perGame ? row.p1.toFixed(1) : row.p1.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{row.label}</span>
        <span className={`text-sm font-semibold tabular-nums ${p2Better ? "text-emerald-400" : "text-muted-foreground"}`}>
          {row.perGame ? row.p2.toFixed(1) : row.p2.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-1 h-2.5">
        <div className="flex-1 flex justify-end">
          <div
            className="h-full rounded-l-full transition-all duration-500"
            style={{ width: `${p1Pct}%`, backgroundColor: color1, opacity: p1Better ? 1 : 0.4 }}
          />
        </div>
        <div className="flex-1">
          <div
            className="h-full rounded-r-full transition-all duration-500"
            style={{ width: `${p2Pct}%`, backgroundColor: color2, opacity: p2Better ? 1 : 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

export default function CompareClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [p1, setP1] = useState<PlayerStats | null>(null);
  const [p2, setP2] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);

  const COLOR1 = "#3b82f6";
  const COLOR2 = "#22c55e";

  const updateUrl = useCallback(
    (id1: string | null, id2: string | null) => {
      const params = new URLSearchParams();
      if (id1) params.set("p1", id1);
      if (id2) params.set("p2", id2);
      const qs = params.toString();
      router.replace(qs ? `/compare?${qs}` : "/compare", { scroll: false });
    },
    [router]
  );

  // Load from URL params on mount
  useEffect(() => {
    const id1 = searchParams.get("p1");
    const id2 = searchParams.get("p2");
    if (id1 || id2) {
      setLoading(true);
      Promise.all([id1 ? getPlayerStats(id1) : null, id2 ? getPlayerStats(id2) : null]).then(([r1, r2]) => {
        if (r1) setP1(r1);
        if (r2) setP2(r2);
        setLoading(false);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectP1 = async (id: string) => {
    setLoading(true);
    const s = await getPlayerStats(id);
    if (s) {
      setP1(s);
      updateUrl(s.id, p2?.id || null);
    }
    setLoading(false);
  };

  const selectP2 = async (id: string) => {
    setLoading(true);
    const s = await getPlayerStats(id);
    if (s) {
      setP2(s);
      updateUrl(p1?.id || null, s.id);
    }
    setLoading(false);
  };

  const clearP1 = () => {
    setP1(null);
    updateUrl(null, p2?.id || null);
  };
  const clearP2 = () => {
    setP2(null);
    updateUrl(p1?.id || null, null);
  };

  const swap = () => {
    const tmp = p1;
    setP1(p2);
    setP2(tmp);
    updateUrl(p2?.id || null, tmp?.id || null);
  };

  const rows: CompareRow[] =
    p1 && p2
      ? [
          { label: "Games Played", key: "gp", p1: p1.games_played, p2: p2.games_played },
          { label: "Total Points", key: "pts", p1: p1.total_points, p2: p2.total_points },
          {
            label: "PPG",
            key: "ppg",
            p1: p1.games_played > 0 ? p1.total_points / p1.games_played : 0,
            p2: p2.games_played > 0 ? p2.total_points / p2.games_played : 0,
            perGame: true,
          },
          { label: "Free Throws (1PT)", key: "ft", p1: p1.one_point, p2: p2.one_point },
          { label: "2-Pointers", key: "2pt", p1: p1.two_point, p2: p2.two_point },
          { label: "3-Pointers", key: "3pt", p1: p1.three_point, p2: p2.three_point },
          {
            label: "2PT/G",
            key: "2ptpg",
            p1: p1.games_played > 0 ? p1.two_point / p1.games_played : 0,
            p2: p2.games_played > 0 ? p2.two_point / p2.games_played : 0,
            perGame: true,
          },
          {
            label: "3PT/G",
            key: "3ptpg",
            p1: p1.games_played > 0 ? p1.three_point / p1.games_played : 0,
            p2: p2.games_played > 0 ? p2.three_point / p2.games_played : 0,
            perGame: true,
          },
          { label: "Total Fouls", key: "fouls", p1: p1.total_fouls, p2: p2.total_fouls },
          {
            label: "Fouls/G",
            key: "fpg",
            p1: p1.games_played > 0 ? p1.total_fouls / p1.games_played : 0,
            p2: p2.games_played > 0 ? p2.total_fouls / p2.games_played : 0,
            perGame: true,
          },
        ]
      : [];

  const chartData =
    p1 && p2
      ? [
          { stat: "PPG", p1: +(p1.games_played > 0 ? p1.total_points / p1.games_played : 0).toFixed(1), p2: +(p2.games_played > 0 ? p2.total_points / p2.games_played : 0).toFixed(1) },
          { stat: "2PT/G", p1: +(p1.games_played > 0 ? p1.two_point / p1.games_played : 0).toFixed(1), p2: +(p2.games_played > 0 ? p2.two_point / p2.games_played : 0).toFixed(1) },
          { stat: "3PT/G", p1: +(p1.games_played > 0 ? p1.three_point / p1.games_played : 0).toFixed(1), p2: +(p2.games_played > 0 ? p2.three_point / p2.games_played : 0).toFixed(1) },
          { stat: "FT/G", p1: +(p1.games_played > 0 ? p1.one_point / p1.games_played : 0).toFixed(1), p2: +(p2.games_played > 0 ? p2.one_point / p2.games_played : 0).toFixed(1) },
          { stat: "Fouls/G", p1: +(p1.games_played > 0 ? p1.total_fouls / p1.games_played : 0).toFixed(1), p2: +(p2.games_played > 0 ? p2.total_fouls / p2.games_played : 0).toFixed(1) },
        ]
      : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compare Players</h1>
        <p className="text-muted-foreground">Select two players to see a side-by-side stats comparison.</p>
      </div>

      {/* Player selection */}
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-8">
        <PlayerSearch slot={1} selected={p1} onSelect={selectP1} onClear={clearP1} />
        <div className="flex items-center justify-center pt-6">
          {p1 && p2 ? (
            <button onClick={swap} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Swap players">
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          ) : (
            <span className="text-muted-foreground text-lg font-bold">VS</span>
          )}
        </div>
        <PlayerSearch slot={2} selected={p2} onSelect={selectP2} onClear={clearP2} />
      </div>

      {loading && <p className="text-center text-muted-foreground py-8">Loading stats...</p>}

      {/* Comparison */}
      {p1 && p2 && !loading && (
        <>
          {/* Header row */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR1 }} />
                <span className="font-semibold">{p1.first_name} {p1.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p2.first_name} {p2.last_name}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR2 }} />
              </div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <ComparisonBar key={row.key} row={row} color1={COLOR1} color2={COLOR2} />
              ))}
            </div>
          </div>

          {/* Per-game chart */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Per-Game Averages</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis dataKey="stat" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Bar dataKey="p1" name={`${p1.first_name} ${p1.last_name}`} fill={COLOR1} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="p2" name={`${p2.first_name} ${p2.last_name}`} fill={COLOR2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!p1 && !p2 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select two players above to compare their stats</p>
        </div>
      )}
    </div>
  );
}
