"use client";

import { useState, useEffect, useCallback } from "react";

type Favourites = {
  players: string[];
  teams: string[];
};

const STORAGE_KEY = "fcv-favourites";

function load(): Favourites {
  if (typeof window === "undefined") return { players: [], teams: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        players: Array.isArray(parsed.players) ? parsed.players : [],
        teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      };
    }
  } catch {}
  return { players: [], teams: [] };
}

function save(favs: Favourites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourites>({ players: [], teams: [] });

  useEffect(() => {
    setFavourites(load());
  }, []);

  const togglePlayer = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = prev.players.includes(id)
        ? { ...prev, players: prev.players.filter((p) => p !== id) }
        : { ...prev, players: [...prev.players, id] };
      save(next);
      return next;
    });
  }, []);

  const toggleTeam = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = prev.teams.includes(id)
        ? { ...prev, teams: prev.teams.filter((t) => t !== id) }
        : { ...prev, teams: [...prev.teams, id] };
      save(next);
      return next;
    });
  }, []);

  const isPlayerFav = useCallback((id: string) => favourites.players.includes(id), [favourites.players]);
  const isTeamFav = useCallback((id: string) => favourites.teams.includes(id), [favourites.teams]);

  const totalCount = favourites.players.length + favourites.teams.length;

  return { favourites, togglePlayer, toggleTeam, isPlayerFav, isTeamFav, totalCount };
}
