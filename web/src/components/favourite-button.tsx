"use client";

import { Heart } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";

type Props = {
  id: string;
  type: "player" | "team";
  className?: string;
};

export function FavouriteButton({ id, type, className = "" }: Props) {
  const { togglePlayer, toggleTeam, isPlayerFav, isTeamFav } = useFavourites();
  const isFav = type === "player" ? isPlayerFav(id) : isTeamFav(id);
  const toggle = type === "player" ? togglePlayer : toggleTeam;

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
      className={`p-1 rounded-md transition-colors hover:bg-muted/50 ${className}`}
      aria-label={isFav ? `Remove from favourites` : `Add to favourites`}
      title={isFav ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          isFav ? "fill-blue-400 text-blue-400" : "text-muted-foreground hover:text-blue-400"
        }`}
      />
    </button>
  );
}
