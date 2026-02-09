"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Star, Target, Flame, Medal, Award, Zap, Shield, TrendingUp } from "lucide-react";

interface RecordEntry {
  player_id: string;
  first_name: string;
  last_name: string;
  value: number;
  games?: number;
  season?: string;
  label?: string;
  threes?: number;
}

interface HoFNominee {
  player_id: string;
  first_name: string;
  last_name: string;
  ppg: number;
  games: number;
  seasons: number;
  total_points: number;
  score: number;
}

interface HallOfFameData {
  career_leaders: {
    most_points: RecordEntry[];
    most_games: RecordEntry[];
    highest_ppg: RecordEntry[];
    most_threes: RecordEntry[];
  };
  season_records: {
    highest_ppg: RecordEntry[];
    most_points: RecordEntry[];
    most_threes: RecordEntry[];
  };
  efficiency: {
    best_three_point_rate: RecordEntry[];
    lowest_fouls_per_game: RecordEntry[];
  };
  hall_of_fame: HoFNominee[];
}

function PlayerLink({ id, first, last }: { id: string; first: string; last: string }) {
  return (
    <Link href={`/players/${id}`} className="text-amber-400 hover:text-amber-300 transition-colors font-semibold">
      {first} {last}
    </Link>
  );
}

function RecordCard({ title, icon: Icon, entries, unit, iconColor }: {
  title: string;
  icon: React.ElementType;
  entries: RecordEntry[];
  unit?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-slate-900/80 border border-amber-900/30 rounded-2xl p-5 hover:border-amber-500/40 transition-all">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${iconColor || "text-amber-400"}`} />
        <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2.5">
        {entries.map((entry, i) => (
          <div key={`${entry.player_id}-${i}`} className="flex items-center gap-3">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
              i === 0 ? "bg-amber-500 text-slate-950" :
              i === 1 ? "bg-slate-400 text-slate-950" :
              i === 2 ? "bg-amber-700 text-slate-100" :
              "bg-slate-800 text-slate-400"
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <PlayerLink id={entry.player_id} first={entry.first_name} last={entry.last_name} />
              {entry.season && (
                <span className="text-xs text-slate-500 ml-2">({entry.season})</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-white font-bold">{entry.value}</span>
              {unit && <span className="text-slate-500 text-xs ml-1">{unit}</span>}
              {entry.games !== undefined && (
                <span className="text-slate-600 text-xs block">{entry.games} gm</span>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-slate-600 text-sm">No qualifying records</p>}
      </div>
    </div>
  );
}

function HoFBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-amber-400" />;
  if (rank <= 3) return <Star className="w-5 h-5 text-amber-500" />;
  return <Medal className="w-5 h-5 text-amber-700" />;
}

export default function HallOfFamePage() {
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hall-of-fame")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3 text-amber-400">
          <Trophy className="w-8 h-8" />
          <span className="text-lg font-semibold">Loading Hall of Fame...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Failed to load Hall of Fame data.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-amber-900/30">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-slate-950 to-slate-950" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
            <Trophy className="w-9 h-9 text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
            Hall of Fame & Records
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Celebrating the greatest players and most remarkable achievements in Victorian basketball history.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Hall of Fame Inductees */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-100">Hall of Fame Inductees</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.hall_of_fame.map((nominee, i) => (
              <Link
                key={nominee.player_id}
                href={`/players/${nominee.player_id}`}
                className={`group relative bg-slate-900/80 border rounded-2xl p-5 text-center hover:scale-[1.02] transition-all ${
                  i === 0 ? "border-amber-400/60 shadow-lg shadow-amber-500/10" :
                  i <= 2 ? "border-amber-600/40" : "border-amber-900/30"
                }`}
              >
                <div className="flex justify-center mb-3">
                  <HoFBadge rank={i + 1} />
                </div>
                <h3 className="text-white font-bold group-hover:text-amber-300 transition-colors">
                  {nominee.first_name} {nominee.last_name}
                </h3>
                <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                  <div><span className="text-amber-400 font-semibold">{nominee.ppg}</span> PPG</div>
                  <div>{nominee.games} games · {nominee.seasons} seasons</div>
                  <div>{nominee.total_points} total pts</div>
                </div>
                <div className="mt-3 px-2 py-1 bg-amber-500/10 rounded-full">
                  <span className="text-amber-400 text-xs font-bold">Score: {nominee.score}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Career Leaders */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-amber-100">All-Time Career Leaders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <RecordCard title="Most Career Points" icon={Zap} entries={data.career_leaders.most_points} unit="pts" iconColor="text-yellow-400" />
            <RecordCard title="Most Games Played" icon={Shield} entries={data.career_leaders.most_games} unit="gm" iconColor="text-emerald-400" />
            <RecordCard title="Highest Career PPG" icon={TrendingUp} entries={data.career_leaders.highest_ppg} unit="ppg" iconColor="text-rose-400" />
            <RecordCard title="Most Career 3-Pointers" icon={Target} entries={data.career_leaders.most_threes} unit="3PT" iconColor="text-blue-400" />
          </div>
        </section>

        {/* Season Records */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-100">Single-Season Records</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RecordCard title="Highest Season PPG" icon={TrendingUp} entries={data.season_records.highest_ppg} unit="ppg" iconColor="text-rose-400" />
            <RecordCard title="Most Points in a Season" icon={Zap} entries={data.season_records.most_points} unit="pts" iconColor="text-yellow-400" />
            <RecordCard title="Most 3PT in a Season" icon={Target} entries={data.season_records.most_threes} unit="3PT" iconColor="text-blue-400" />
          </div>
        </section>

        {/* Efficiency */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-100">Efficiency Records</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RecordCard title="Best 3PT Per Game" icon={Target} entries={data.efficiency.best_three_point_rate} unit="/gm" iconColor="text-cyan-400" />
            <RecordCard title="Lowest Fouls Per Game" icon={Shield} entries={data.efficiency.lowest_fouls_per_game} unit="/gm" iconColor="text-green-400" />
          </div>
        </section>
      </div>
    </div>
  );
}
