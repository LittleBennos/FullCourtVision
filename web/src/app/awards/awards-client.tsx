"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Target, TrendingUp, Crosshair, Shield, Crown, Award } from "lucide-react";
import type { SeasonAwards, AwardWinner } from "@/lib/data";

type Props = {
  seasons: { id: string; name: string }[];
  awardsMap: Record<string, SeasonAwards>;
};

const awardConfig = [
  { key: "mvp" as const, label: "MVP", description: "Highest PPG (min. 10 games)", icon: Crown, color: "yellow" },
  { key: "top_scorer" as const, label: "Top Scorer", description: "Most total points scored", icon: Target, color: "red" },
  { key: "most_improved" as const, label: "Most Improved", description: "Biggest PPG increase from previous season", icon: TrendingUp, color: "green" },
  { key: "sharpshooter" as const, label: "Sharpshooter", description: "Highest 3PT per game (min. 5 games)", icon: Crosshair, color: "blue" },
  { key: "iron_man" as const, label: "Iron Man", description: "Most games played", icon: Shield, color: "purple" },
  { key: "best_team" as const, label: "Best Team", description: "Highest win percentage (min. 10 games)", icon: Trophy, color: "orange" },
];

const colorMap: Record<string, string> = {
  yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30 text-yellow-400",
  red: "from-red-500/20 to-red-600/5 border-red-500/30 text-red-400",
  green: "from-green-500/20 to-green-600/5 border-green-500/30 text-green-400",
  blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",
  purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400",
  orange: "from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-400",
};

const iconBgMap: Record<string, string> = {
  yellow: "bg-yellow-500/20",
  red: "bg-red-500/20",
  green: "bg-green-500/20",
  blue: "bg-blue-500/20",
  purple: "bg-purple-500/20",
  orange: "bg-orange-500/20",
};

function AwardCard({ award, config }: { award: AwardWinner | null; config: typeof awardConfig[0] }) {
  const Icon = config.icon;
  const colors = colorMap[config.color];
  const iconBg = iconBgMap[config.color];

  return (
    <div className={`relative bg-gradient-to-br ${colors} rounded-2xl border p-6 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{config.label}</h3>
          {award ? (
            <>
              <Link
                href={award.type === "player" ? `/players/${award.id}` : `/teams/${award.id}`}
                className="text-xl font-bold text-foreground hover:text-accent transition-colors block truncate"
              >
                {award.name}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">{award.team_name}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg">
                <span className="text-xs text-muted-foreground">{award.stat_label}:</span>
                <span className="text-sm font-bold text-foreground">{award.stat_value}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground italic mt-2">No qualifying candidates</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 mt-4">{config.description}</p>
    </div>
  );
}

export function AwardsClient({ seasons, awardsMap }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.name || "");
  const awards = awardsMap[selectedSeason] || { mvp: null, top_scorer: null, most_improved: null, sharpshooter: null, iron_man: null, best_team: null };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Season Awards</h1>
            <p className="text-muted-foreground">Celebrating the best performers of each season</p>
          </div>
        </div>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent w-full sm:w-auto"
        >
          {seasons.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {awardConfig.map((config) => (
          <AwardCard key={config.key} award={awards[config.key]} config={config} />
        ))}
      </div>

      <div className="mt-8 bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground mb-3">How Awards Are Determined</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>MVP:</strong> Highest points per game among players with at least 10 games played</li>
          <li><strong>Top Scorer:</strong> Most total points scored across all games in the season</li>
          <li><strong>Most Improved:</strong> Biggest PPG increase compared to the previous season (min. 5 GP each season)</li>
          <li><strong>Sharpshooter:</strong> Highest three-pointers per game with at least 5 games played</li>
          <li><strong>Iron Man:</strong> Most games played during the season</li>
          <li><strong>Best Team:</strong> Highest win percentage among teams with at least 10 games</li>
        </ul>
      </div>
    </div>
  );
}
