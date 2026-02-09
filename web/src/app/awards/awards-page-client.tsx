"use client";

import { useState } from "react";
import { Award, Trophy, BarChart3 } from "lucide-react";
import { AwardsClient } from "./awards-client";
import { WeeklyAwardsClient } from "./weekly-awards-client";
import type { SeasonAwards } from "@/lib/data";

type Props = {
  seasons: { id: string; name: string }[];
  awardsMap: Record<string, SeasonAwards>;
};

export function AwardsPageClient({ seasons, awardsMap }: Props) {
  const [tab, setTab] = useState<"season" | "leaders">("season");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Awards</h1>
            <p className="text-muted-foreground">Celebrating the best performers</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        <button
          onClick={() => setTab("season")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "season"
              ? "bg-accent text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Season Awards
        </button>
        <button
          onClick={() => setTab("leaders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "leaders"
              ? "bg-accent text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stat Leaders
        </button>
      </div>

      {tab === "season" ? (
        <AwardsClient seasons={seasons} awardsMap={awardsMap} />
      ) : (
        <WeeklyAwardsClient seasons={seasons} />
      )}
    </div>
  );
}
