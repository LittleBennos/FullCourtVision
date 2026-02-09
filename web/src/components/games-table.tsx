"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Calendar, MapPin, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type Game = {
  id: string;
  home_team: {
    id: string;
    name: string;
  };
  away_team: {
    id: string;
    name: string;
  };
  home_score: number;
  away_score: number;
  venue: string;
  date: string;
  time: string;
  round: {
    name: string;
    grade: {
      name: string;
      season: {
        name: string;
      };
    };
  };
};

export function GamesTable() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const perPage = 25;

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * perPage).toString(),
        limit: perPage.toString(),
      });
      const res = await fetch(`/api/games?${params}`);
      const data = await res.json();
      setGames(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (e) {
      console.error("Failed to fetch games", e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const totalPages = Math.ceil(total / perPage);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading games...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Games List */}
      <div className="space-y-4">
        {games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No games found
          </div>
        ) : (
          games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="block bg-card rounded-xl border border-border p-6 hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Teams and Score */}
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-6 mb-3">
                    {/* Home Team */}
                    <div className="text-right flex-1">
                      <div className="font-medium text-lg">{game.home_team.name}</div>
                      <div className="text-2xl font-bold">
                        {game.home_score ?? "-"}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-muted-foreground font-medium px-4">
                      VS
                    </div>

                    {/* Away Team */}
                    <div className="text-left flex-1">
                      <div className="font-medium text-lg">{game.away_team.name}</div>
                      <div className="text-2xl font-bold">
                        {game.away_score ?? "-"}
                      </div>
                    </div>
                  </div>

                  {/* Game Details */}
                  <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(game.date)}
                      {game.time && (
                        <span className="ml-1">{formatTime(game.time)}</span>
                      )}
                    </div>
                    {game.venue && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {game.venue}
                      </div>
                    )}
                  </div>

                  {/* Competition Info */}
                  <div className="text-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      {game.round.grade.season.name} • {game.round.grade.name} • {game.round.name}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {page * perPage + 1} to{" "}
            {Math.min((page + 1) * perPage, total)} of {total.toLocaleString()}{" "}
            games
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}