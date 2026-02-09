"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy, TrendingUp, Flame, Target, Shield, Star, Award,
  Users, Gamepad2, Zap, BarChart3, Crown, Medal,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const ACCENT_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1",
];

type Award = { id: string; name: string; team: string; stat: string } | null;

interface SeasonRecapData {
  season: { id: string; name: string; competition: string; start_date?: string; end_date?: string };
  top_scorers: { id: string; name: string; team: string; ppg: number; total_points: number; games: number }[];
  most_improved: { id: string; name: string; team: string; current_ppg: number; previous_ppg: number; improvement: number }[];
  record_games: { id: string; date: string; home_team: string; away_team: string; home_score: number; away_score: number; total_score: number; winning_score: number }[];
  biggest_upsets: { id: string; date: string; home_team: string; away_team: string; home_score: number; away_score: number; differential: number; winner: string }[];
  most_consistent: { id: string; name: string; team: string; ppg: number; games: number; stddev: number }[];
  awards: { mvp: Award; top_scorer: Award; dpoy: Award; sixth_man: Award; mip: Award; sharpshooter: Award; iron_man: Award };
  summary: { total_players: number; total_games: number; total_points: number; avg_ppg: number };
}

function SectionCard({ title, icon: Icon, children, color = "accent" }: { title: string; icon: any; children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function AwardCard({ label, award, icon: Icon }: { label: string; award: Award; icon: any }) {
  if (!award) return null;
  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-amber-500">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <Link href={`/players/${award.id}`} className="text-lg font-bold hover:text-accent transition-colors">
        {award.name}
      </Link>
      <p className="text-sm text-muted-foreground">{award.team}</p>
      <p className="text-sm font-medium text-accent">{award.stat}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function SeasonRecapClient({
  seasons,
  initialSeason,
}: {
  seasons: { id: string; name: string }[];
  initialSeason?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSeason = searchParams.get("season") || initialSeason || (seasons[0]?.id ?? "");
  const [data, setData] = useState<SeasonRecapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!currentSeason) return;
    setLoading(true);
    setErr("");
    fetch(`/api/analytics/season-recap?season=${currentSeason}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch(() => setErr("Failed to load data"))
      .finally(() => setLoading(false));
  }, [currentSeason]);

  return (
    <div className="space-y-8">
      {/* Season Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <select
          value={currentSeason}
          onChange={(e) => router.push(`/analytics/season-recap?season=${e.target.value}`)}
          className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {data && (
          <div className="text-sm text-muted-foreground">
            {data.season.competition}
            {data.season.start_date && ` · ${data.season.start_date} → ${data.season.end_date || "present"}`}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">{err}</div>}

      {data && !loading && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Players" value={data.summary.total_players} icon={Users} />
            <SummaryCard label="Games Played" value={data.summary.total_games} icon={Gamepad2} />
            <SummaryCard label="Total Points Scored" value={data.summary.total_points} icon={Zap} />
            <SummaryCard label="Avg PPG" value={data.summary.avg_ppg} icon={BarChart3} />
          </div>

          {/* Awards */}
          <SectionCard title="Season Awards" icon={Trophy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AwardCard label="MVP" award={data.awards.mvp} icon={Crown} />
              <AwardCard label="Top Scorer" award={data.awards.top_scorer} icon={Flame} />
              <AwardCard label="Most Improved" award={data.awards.mip} icon={TrendingUp} />
              <AwardCard label="Sharpshooter" award={data.awards.sharpshooter} icon={Target} />
              <AwardCard label="Defensive POY" award={data.awards.dpoy} icon={Shield} />
              <AwardCard label="6th Man" award={data.awards.sixth_man} icon={Star} />
              <AwardCard label="Iron Man" award={data.awards.iron_man} icon={Medal} />
            </div>
          </SectionCard>

          {/* Top 10 Scorers */}
          {data.top_scorers.length > 0 && (
            <SectionCard title="Top 10 Scorers" icon={Flame}>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_scorers} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: any) => [`${v} PPG`, "Points Per Game"]}
                    />
                    <Bar dataKey="ppg" radius={[0, 6, 6, 0]}>
                      {data.top_scorers.map((_, i) => (
                        <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Player</th>
                      <th className="text-left py-2 px-2">Team</th>
                      <th className="text-right py-2 px-2">PPG</th>
                      <th className="text-right py-2 px-2">Total Pts</th>
                      <th className="text-right py-2 px-2">Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_scorers.map((p, i) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-2 font-bold text-accent">{i + 1}</td>
                        <td className="py-2 px-2">
                          <Link href={`/players/${p.id}`} className="font-medium hover:text-accent transition-colors">{p.name}</Link>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">{p.team}</td>
                        <td className="py-2 px-2 text-right font-bold">{p.ppg}</td>
                        <td className="py-2 px-2 text-right">{p.total_points}</td>
                        <td className="py-2 px-2 text-right">{p.games}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Most Improved */}
          {data.most_improved.length > 0 && (
            <SectionCard title="Most Improved Players" icon={TrendingUp}>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.most_improved.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: any, name: any) => {
                        if (name === "improvement") return [`+${v}`, "PPG Improvement"];
                        return [v, name];
                      }}
                    />
                    <Bar dataKey="improvement" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.most_improved.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <span className="text-lg font-bold text-accent w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/players/${p.id}`} className="font-medium hover:text-accent transition-colors truncate block">{p.name}</Link>
                      <span className="text-xs text-muted-foreground">{p.team}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-500 font-bold">+{p.improvement}</span>
                      <span className="text-xs text-muted-foreground block">{p.previous_ppg} → {p.current_ppg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Record-Breaking Games */}
          {data.record_games.length > 0 && (
            <SectionCard title="Highest-Scoring Games" icon={Zap}>
              <div className="space-y-3">
                {data.record_games.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <span className="text-lg font-bold text-accent w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {g.home_team} <span className="text-accent font-bold">{g.home_score}</span>
                        {" vs "}
                        <span className="text-accent font-bold">{g.away_score}</span> {g.away_team}
                      </div>
                      <span className="text-xs text-muted-foreground">{g.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{g.winning_score}</span>
                      <span className="text-xs text-muted-foreground block">high score</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Biggest Blowouts */}
          {data.biggest_upsets.length > 0 && (
            <SectionCard title="Biggest Blowouts" icon={Target}>
              <div className="space-y-3">
                {data.biggest_upsets.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <span className="text-lg font-bold text-accent w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {g.home_team} <span className="font-bold">{g.home_score}</span>
                        {" vs "}
                        <span className="font-bold">{g.away_score}</span> {g.away_team}
                      </div>
                      <span className="text-xs text-muted-foreground">{g.date} · Winner: {g.winner}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg text-red-400">+{g.differential}</span>
                      <span className="text-xs text-muted-foreground block">margin</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Most Consistent */}
          {data.most_consistent.length > 0 && (
            <SectionCard title="Most Consistent Players" icon={Shield}>
              <p className="text-sm text-muted-foreground mb-4">
                Players with the lowest scoring variance across grade entries (min 2 grades).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.most_consistent.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <span className="text-lg font-bold text-accent w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/players/${p.id}`} className="font-medium hover:text-accent transition-colors truncate block">{p.name}</Link>
                      <span className="text-xs text-muted-foreground">{p.team} · {p.games} games</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{p.ppg} PPG</span>
                      <span className="text-xs text-muted-foreground block">σ = {p.stddev}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
