"use client";

import { ShareButton } from "./share-button";
import { computeArchetype } from "./archetype-badge";

interface PlayerShareButtonProps {
  name: string;
  games: number;
  ppg: number;
  totalPoints: number;
  totalFouls: number;
  threePtPg: number;
  twoPtPg: number;
  foulsPg: number;
  competitions: number;
}

export function PlayerShareButton({
  name,
  games,
  ppg,
  totalPoints,
  totalFouls,
  threePtPg,
  twoPtPg,
  foulsPg,
  competitions,
}: PlayerShareButtonProps) {
  const archetype = games >= 3 ? `${computeArchetype(ppg, threePtPg, twoPtPg, foulsPg)}` : undefined;
  const archetypeMap: Record<string, string> = {
    Sharpshooter: "🎯 Sharpshooter",
    "Inside Scorer": "💪 Inside Scorer",
    "High Volume": "🔥 High Volume",
    Physical: "🛡️ Physical",
    Balanced: "⚖️ Balanced",
  };

  return (
    <ShareButton
      type="player"
      name={name}
      subtitle={`${competitions} competition${competitions !== 1 ? "s" : ""}`}
      archetype={archetype ? archetypeMap[archetype] || archetype : undefined}
      stats={[
        { label: "Games Played", value: games },
        { label: "Points Per Game", value: ppg, accent: true },
        { label: "Total Points", value: totalPoints },
        { label: "Total Fouls", value: totalFouls },
      ]}
    />
  );
}
