"use client";

import { useEffect, useState } from "react";
import { useFavourites } from "@/hooks/useFavourites";
import Link from "next/link";
import { Bell, Loader2, Trophy, XCircle, Calendar } from "lucide-react";

const LAST_VISIT_KEY = "fcv-whats-new-last-visit";

type WhatsNewItem = {
  player_id: string;
  player_name: string;
  game_id: string;
  game_date: string;
  game_time: string | null;
  opponent: string;
  team_score: number;
  opponent_score: number;
  won: boolean;
  team_name: string;
  grade_name: string;
  season_name: string;
  season_stats: {
    games_played: number;
    total_points: number;
    ppg: number;
    two_point: number;
    three_point: number;
    total_fouls: number;
    ranking: number | null;
  };
};

function getLastVisit(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_VISIT_KEY);
}

function setLastVisit() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
}

export function getNewCount(items: WhatsNewItem[]): number {
  const lastVisit = getLastVisit();
  if (!lastVisit) return items.length;
  return items.filter((i) => i.game_date > lastVisit.slice(0, 10)).length;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function WhatsNew() {
  const { favourites } = useFavourites();
  const [items, setItems] = useState<WhatsNewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (favourites.players.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    async function fetchWhatsNew() {
      setLoading(true);
      try {
        const res = await fetch(`/api/whats-new?playerIds=${favourites.players.join(",")}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || [];
          setItems(data);
          setNewCount(getNewCount(data));
        }
      } catch (e) {
        console.error("Failed to fetch what's new", e);
      } finally {
        setLoading(false);
      }
    }

    fetchWhatsNew();
  }, [favourites.players]);

  // Mark as visited when component mounts
  useEffect(() => {
    const timer = setTimeout(() => setLastVisit(), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (favourites.players.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
        <Bell className="w-5 h-5 text-blue-400" />
        What&apos;s New
        {newCount > 0 && (
          <span className="ml-2 min-w-[22px] h-[22px] flex items-center justify-center bg-blue-400 text-white text-xs font-bold rounded-full px-1.5">
            {newCount}
          </span>
        )}
        <span className="text-sm font-normal text-muted-foreground ml-1">Recent games from your followed players</span>
      </h2>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-slate-950 rounded-xl border border-border p-6 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No recent games found for your followed players.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isNew = newCount > 0 && getLastVisit() ? item.game_date > getLastVisit()!.slice(0, 10) : true;
            return (
              <div
                key={`${item.player_id}-${item.game_id}`}
                className={`bg-slate-950 rounded-xl border p-4 transition-colors hover:border-blue-400/50 ${
                  isNew ? "border-blue-400/30" : "border-border"
                }`}
              >
                {/* Header: player name + result */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link href={`/players/${item.player_id}`} className="font-semibold text-blue-400 hover:underline truncate">
                    {item.player_name}
                  </Link>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                      item.won ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"
                    }`}
                  >
                    {item.won ? "W" : "L"} {item.team_score}-{item.opponent_score}
                  </span>
                </div>

                {/* Game info */}
                <div className="text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(item.game_date)}
                    <span className="text-foreground/60">vs</span>
                    <span className="text-foreground truncate">{item.opponent}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-70">{item.grade_name} · {item.season_name}</div>
                </div>

                {/* Season stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-900 rounded-lg py-1.5 px-1">
                    <div className="text-lg font-bold text-foreground">{item.season_stats.ppg}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">PPG</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg py-1.5 px-1">
                    <div className="text-lg font-bold text-foreground">{item.season_stats.two_point}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">2PT</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg py-1.5 px-1">
                    <div className="text-lg font-bold text-foreground">{item.season_stats.three_point}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">3PT</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg py-1.5 px-1">
                    <div className="text-lg font-bold text-foreground">{item.season_stats.total_fouls}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">FOULS</div>
                  </div>
                </div>

                {/* Team + ranking footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span className="truncate">{item.team_name}</span>
                  {item.season_stats.ranking && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      #{item.season_stats.ranking}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
