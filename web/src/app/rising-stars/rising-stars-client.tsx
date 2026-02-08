"use client";

import Link from "next/link";
import { RisingStar } from "@/lib/data";
import { TrendingUp } from "lucide-react";

type Props = {
  risingStars: RisingStar[];
};

export function RisingStarsClient({ risingStars }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-bold">Rising Stars</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Players with the biggest PPG improvement between their most recent and previous seasons (min. 5 games each season)
      </p>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Top 50 Rising Stars</h2>
        <p className="text-sm text-muted-foreground">
          Showing players who have shown the most improvement in points per game between their last two seasons with meaningful playing time.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Player</th>
              <th className="text-left px-4 py-3 font-medium">Team</th>
              <th className="text-left px-4 py-3 font-medium">Organisation</th>
              <th className="text-right px-4 py-3 font-medium">Previous PPG</th>
              <th className="text-right px-4 py-3 font-medium">Current PPG</th>
              <th className="text-right px-4 py-3 font-medium">Improvement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {risingStars.map((player, i) => (
              <tr key={player.player_id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">
                  {i < 3 ? (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      i === 1 ? "bg-gray-400/20 text-gray-300" :
                      "bg-orange-500/20 text-orange-400"
                    }`}>
                      {i + 1}
                    </span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/players/${player.player_id}`} className="text-accent hover:underline font-medium">
                    {player.first_name} {player.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {player.team_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Link href={`/organisations/${player.player_id.substring(0, 8)}`} className="hover:text-foreground hover:underline">
                    {player.organisation_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {player.previous_season_ppg.toFixed(1)}
                  <div className="text-xs text-muted-foreground/70">
                    {player.previous_season_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {player.current_season_ppg.toFixed(1)}
                  <div className="text-xs text-muted-foreground/70">
                    {player.current_season_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                    <TrendingUp className="w-3 h-3" />
                    +{player.improvement}
                  </span>
                </td>
              </tr>
            ))}
            {risingStars.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No rising stars found. Players need at least 5 games in their last two seasons to qualify.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        <p className="mb-2"><strong>Methodology:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Players must have played at least 5 games in both their most recent and previous seasons</li>
          <li>Only positive improvements are shown (players who got better)</li>
          <li>Rankings are based on absolute PPG improvement, not percentage change</li>
          <li>Season ordering is determined by season start dates</li>
        </ul>
      </div>
    </div>
  );
}