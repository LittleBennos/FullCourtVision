"use client";

import { ShareButton } from "./share-button";

interface TeamShareButtonProps {
  name: string;
  orgName: string;
  seasonName: string;
  wins: number;
  losses: number;
  games: number;
  totalPoints: number;
  avgPPG: string;
}

export function TeamShareButton({
  name,
  orgName,
  seasonName,
  wins,
  losses,
  games,
  totalPoints,
  avgPPG,
}: TeamShareButtonProps) {
  const winPct = games > 0 ? ((wins / games) * 100).toFixed(0) + "%" : "-";

  return (
    <ShareButton
      type="team"
      name={name}
      subtitle={`${orgName} · ${seasonName}`}
      stats={[
        { label: "Record", value: `${wins}W-${losses}L` },
        { label: "Win %", value: winPct, accent: true },
        { label: "Total Points", value: totalPoints.toLocaleString() },
        { label: "Team PPG", value: avgPPG, accent: true },
      ]}
    />
  );
}
