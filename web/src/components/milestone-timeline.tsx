"use client";

import { useEffect, useState } from "react";
import { Target, Users, Flame, Zap, Trophy, Loader2 } from "lucide-react";

interface Milestone {
  id: string;
  category: string;
  name: string;
  description: string;
  target: number;
  current: number;
  reached: boolean;
  dateAchieved: string | null;
  icon: string;
}

interface MilestoneData {
  reached: Milestone[];
  upcoming: Milestone[];
}

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  users: Users,
  flame: Flame,
  zap: Zap,
};

const categoryColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  points: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", accent: "bg-amber-500" },
  games: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", accent: "bg-blue-500" },
  scoring: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", accent: "bg-orange-500" },
  threes: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", accent: "bg-emerald-500" },
};

export function MilestoneTimeline({ playerId }: { playerId: string }) {
  const [data, setData] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${playerId}/milestones`)
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-400">Loading milestones...</span>
      </div>
    );
  }

  if (!data || (data.reached.length === 0 && data.upcoming.length === 0)) {
    return null;
  }

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-6">
      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Career Milestones
      </h3>

      {/* Achieved milestones */}
      {data.reached.length > 0 && (
        <div className="relative mb-8">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700" />
          <div className="space-y-4">
            {data.reached.map((m) => {
              const colors = categoryColors[m.category] || categoryColors.points;
              const Icon = iconMap[m.icon] || Target;
              return (
                <div key={m.id} className="relative flex items-start gap-4 pl-0">
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                        ✓ Achieved
                      </span>
                    </div>
                    {m.dateAchieved && (
                      <p className="text-xs text-slate-500 mt-0.5">{m.dateAchieved}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming milestones */}
      {data.upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Upcoming</p>
          <div className="space-y-3">
            {data.upcoming.map((m) => {
              const colors = categoryColors[m.category] || categoryColors.points;
              const Icon = iconMap[m.icon] || Target;
              const pct = m.target > 0 ? Math.round((m.current / m.target) * 100) : 0;
              return (
                <div key={m.id} className="flex items-center gap-4 opacity-60 hover:opacity-80 transition-opacity">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-slate-300">{m.name}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {m.current}/{m.target}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.accent} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
