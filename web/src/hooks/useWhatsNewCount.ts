"use client";

import { useState, useEffect } from "react";
import { useFavourites } from "./useFavourites";

const LAST_VISIT_KEY = "fcv-whats-new-last-visit";

export function useWhatsNewCount() {
  const { favourites } = useFavourites();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (favourites.players.length === 0) {
      setCount(0);
      return;
    }

    async function check() {
      try {
        const res = await fetch(`/api/whats-new?playerIds=${favourites.players.join(",")}`);
        if (!res.ok) return;
        const json = await res.json();
        const items = json.data || [];
        const lastVisit = typeof window !== "undefined" ? localStorage.getItem(LAST_VISIT_KEY) : null;
        if (!lastVisit) {
          setCount(items.length);
        } else {
          const cutoff = lastVisit.slice(0, 10);
          setCount(items.filter((i: any) => i.game_date > cutoff).length);
        }
      } catch {}
    }

    check();
  }, [favourites.players]);

  return count;
}
