"use client";

import { useState } from "react";
import Link from "next/link";

const tabs = [
  { key: "ppg", label: "Points Per Game", valueKey: "ppg", valueLabel: "PPG" },
  { key: "games", label: "Most Games", valueKey: "total_games", valueLabel: "Games" },
  { key: "threes", label: "Most 3-Pointers", valueKey: "total_threes", valueLabel: "3PT" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function LeaderboardsClient({ leaderboards }: { leaderboards: { ppg: any[]; games: any[]; threes: any[] } }) {
  const [tab, setTab] = useState<TabKey>("ppg");
  const activeTab = tabs.find((t) => t.key === tab)!;
  const data = leaderboards[tab] as any[];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Leaderboards</h1>
      <p className="text-muted-foreground mb-6">Top performers across Victorian basketball (min. 10 games)</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? "bg-accent text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Player</th>
              <th className="text-right px-4 py-3 font-medium">Games</th>
              <th className="text-right px-4 py-3 font-medium">{activeTab.valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((p: any, i: number) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
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
                  <Link href={`/players/${p.id}`} className="text-accent hover:underline font-medium">
                    {p.first_name} {p.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.total_games}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-lg">
                  {p[activeTab.valueKey]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
