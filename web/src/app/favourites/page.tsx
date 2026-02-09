import type { Metadata } from "next";
import { FavouritesClient } from "./favourites-client";

export const metadata: Metadata = {
  title: "Favourites — FullCourtVision",
  description: "Your watchlist of favourite players and teams.",
};

export default function FavouritesPage() {
  return <FavouritesClient />;
}
