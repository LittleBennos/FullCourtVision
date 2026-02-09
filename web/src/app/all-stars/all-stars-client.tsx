"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Star, ChevronDown, Users, Loader2 } from "lucide-react";
import { ArchetypeBadge } from "@/components/archetype-badge";

type AllStarPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  grade_name: string;
  games: number;
  ppg: number;
  twoPtPg: number;
  threePtPg: number;
  foulsPg: number;
  archetype: string;
  score: number;
};

type Props = {
  seasons: { id: string; name: string }[];
};

export function AllStarsClient({ seasons }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.name || "");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [allStars, setAllStars] = useState<AllStarPlayer[]>([]);
  const [honorableMentions, setHonorableMentions] = useState<AllStarPlayer[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true);
    const params = new URLSearchParams({ season: selectedSeason });
    if (selectedGrade) params.set("grade", selectedGrade);

    fetch(`/api/all-stars?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAllStars(data.allStars || []);
        setHonorableMentions(data.honorableMentions || []);
        if (!selectedGrade) setGrades(data.grades || []);
      })
      .finally(() => setLoading(false));
  }, [selectedSeason, selectedGrade]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <Trophy className="w-7 h-7 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">All-Star Team</h1>
          <p className="text-muted-foreground">Best 5-player lineup by season</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value);
              setSelectedGrade("");
            }}
            className="appearance-none bg-card border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {/* All-Star 5 */}
          {allStars.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-bold">The All-Star 5</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {allStars.map((player, i) => (
                  <PlayerCard key={player.player_id} player={player} rank={i + 1} featured />
                ))}
              </div>
            </section>
          )}

          {/* Honorable Mentions */}
          {honorableMentions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold">Honorable Mentions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {honorableMentions.map((player, i) => (
                  <PlayerCard key={player.player_id} player={player} rank={i + 6} />
                ))}
              </div>
            </section>
          )}

          {allStars.length === 0 && !loading && (
            <div className="text-center py-20 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No players found for this selection</p>
              <p className="text-sm">Try a different season or grade</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  rank,
  featured,
}: {
  player: AllStarPlayer;
  rank: number;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.player_id}`}
      className={`group block rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg ${
        featured
          ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent"
          : "border-border bg-card"
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Photo placeholder */}
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
          {player.first_name[0]}
          {player.last_name[0]}
        </div>

        {/* Rank badge */}
        <div className="text-center">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
              featured
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            #{rank}
          </span>
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="font-semibold text-sm group-hover:text-accent transition-colors">
            {player.first_name} {player.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{player.team_name}</p>
          {player.grade_name && (
            <p className="text-xs text-muted-foreground/70 truncate">{player.grade_name}</p>
          )}
        </div>

        {/* Archetype */}
        <div className="flex justify-center">
          <ArchetypeBadge
            ppg={player.ppg}
            threePtPg={player.threePtPg}
            twoPtPg={player.twoPtPg}
            foulsPg={player.foulsPg}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-accent">{player.ppg}</p>
            <p className="text-[10px] text-muted-foreground uppercase">PPG</p>
          </div>
          <div>
            <p className="text-lg font-bold">{player.games}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Games</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{player.threePtPg}</p>
            <p className="text-[10px] text-muted-foreground uppercase">3PT/G</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{player.twoPtPg}</p>
            <p className="text-[10px] text-muted-foreground uppercase">2PT/G</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
