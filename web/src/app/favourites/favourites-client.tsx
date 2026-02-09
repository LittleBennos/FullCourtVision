"use client";

import { useFavourites } from "@/hooks/useFavourites";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Users, Activity, Loader2 } from "lucide-react";
import { FavouriteButton } from "@/components/favourite-button";

type PlayerInfo = { id: string; first_name: string; last_name: string; total_games: number; ppg: number };
type TeamInfo = { id: string; name: string; organisation_name?: string; wins: number; losses: number; games_played: number };

export function FavouritesClient() {
  const { favourites } = useFavourites();
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [pRes, tRes] = await Promise.all([
          favourites.players.length > 0
            ? fetch(`/api/players?ids=${favourites.players.join(",")}`)
            : Promise.resolve(null),
          favourites.teams.length > 0
            ? fetch(`/api/teams?ids=${favourites.teams.join(",")}`)
            : Promise.resolve(null),
        ]);
        if (pRes && pRes.ok) {
          const pJson = await pRes.json();
          setPlayers(pJson.data || []);
        } else {
          setPlayers([]);
        }
        if (tRes && tRes.ok) {
          const tJson = await tRes.json();
          setTeams(tJson.data || []);
        } else {
          setTeams([]);
        }
      } catch (e) {
        console.error("Failed to fetch favourites", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [favourites.players, favourites.teams]);

  const empty = favourites.players.length === 0 && favourites.teams.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Heart className="w-8 h-8 text-blue-400" />
        <h1 className="text-3xl font-bold">Favourites</h1>
      </div>
      <p className="text-muted-foreground mb-8">Your watchlist of players and teams</p>

      {loading && !empty && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}

      {empty && (
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-2">No favourites yet</p>
          <p className="text-sm">Click the heart icon on any player or team to add them here.</p>
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <Users className="w-5 h-5 text-blue-400" /> Players
            <span className="text-sm font-normal text-muted-foreground">({players.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 hover:border-blue-400/50 transition-colors relative group">
                <div className="absolute top-3 right-3">
                  <FavouriteButton id={p.id} type="player" />
                </div>
                <Link href={`/players/${p.id}`} className="block">
                  <p className="font-semibold text-lg text-accent hover:underline">
                    {p.first_name} {p.last_name}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{p.total_games} games</span>
                    <span className="font-medium text-foreground">{p.ppg} PPG</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && teams.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
            <Activity className="w-5 h-5 text-blue-400" /> Teams
            <span className="text-sm font-normal text-muted-foreground">({teams.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="bg-card rounded-xl border border-border p-4 hover:border-blue-400/50 transition-colors relative group">
                <div className="absolute top-3 right-3">
                  <FavouriteButton id={t.id} type="team" />
                </div>
                <Link href={`/teams/${t.id}`} className="block">
                  <p className="font-semibold text-lg text-accent hover:underline">{t.name}</p>
                  {t.organisation_name && <p className="text-sm text-muted-foreground mt-1">{t.organisation_name}</p>}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="text-green-400">{t.wins}W</span>
                    <span className="text-red-400">{t.losses}L</span>
                    <span>{t.games_played} GP</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
