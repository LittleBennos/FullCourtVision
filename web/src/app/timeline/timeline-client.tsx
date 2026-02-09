"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Flame,
  AlertTriangle,
  Star,
  Target,
  Loader2,
  ChevronRight,
  Trophy,
  Zap,
} from "lucide-react";

type TimelineEvent = {
  type: "high_score" | "upset" | "milestone" | "three_point";
  date: string | null;
  title: string;
  description: string;
  link: string;
  score: number;
  playerId?: string;
};

type SeasonTimeline = {
  season: string;
  gameCount: number;
  dateRange: { start: string; end: string } | null;
  events: TimelineEvent[];
};

const eventConfig = {
  high_score: {
    icon: Flame,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    badge: "bg-red-500/20 text-red-400",
    label: "High Scoring",
  },
  upset: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-400",
    label: "Upset",
  },
  milestone: {
    icon: Star,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Top Scorer",
  },
  three_point: {
    icon: Target,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400",
    label: "Sharpshooter",
  },
};

type FilterType = "all" | "high_score" | "upset" | "milestone" | "three_point";

export function TimelineClient() {
  const [data, setData] = useState<SeasonTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((d) => {
        setData(d.seasons || []);
        if (d.seasons?.length > 0) setExpandedSeason(d.seasons[0].season);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No timeline data available.
      </div>
    );
  }

  const filters: { key: FilterType; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Zap },
    { key: "high_score", label: "High Scoring", icon: Flame },
    { key: "upset", label: "Upsets", icon: AlertTriangle },
    { key: "milestone", label: "Top Scorers", icon: Star },
    { key: "three_point", label: "Sharpshooters", icon: Target },
  ];

  return (
    <div className="space-y-8">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === key
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Season timelines */}
      {data.map((season) => {
        const isExpanded = expandedSeason === season.season;
        const filteredEvents =
          filter === "all"
            ? season.events
            : season.events.filter((e) => e.type === filter);

        return (
          <div key={season.season} className="space-y-4">
            {/* Season header */}
            <button
              onClick={() =>
                setExpandedSeason(isExpanded ? null : season.season)
              }
              className="w-full flex items-center gap-4 group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-foreground group-hover:text-amber-400 transition-colors">
                    {season.season}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {season.gameCount} games
                    {season.dateRange &&
                      ` · ${formatDate(season.dateRange.start)} – ${formatDate(season.dateRange.end)}`}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-muted-foreground transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </button>

            {/* Horizontal scroll timeline */}
            {isExpanded && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-700" />

                {filteredEvents.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No events match this filter.
                  </p>
                ) : (
                  <div className="overflow-x-auto pb-4 scrollbar-thin">
                    <div className="flex gap-4 min-w-max px-2 pt-2">
                      {filteredEvents.map((event, i) => {
                        const config = eventConfig[event.type];
                        const Icon = config.icon;
                        return (
                          <Link
                            href={event.link}
                            key={`${event.type}-${i}`}
                            className={`relative flex-shrink-0 w-64 rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${config.bg}`}
                          >
                            {/* Connector dot */}
                            <div
                              className={`absolute -top-[5px] left-8 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                config.color === "text-red-400"
                                  ? "bg-red-400"
                                  : config.color === "text-yellow-400"
                                  ? "bg-yellow-400"
                                  : config.color === "text-amber-400"
                                  ? "bg-amber-400"
                                  : "bg-blue-400"
                              }`}
                            />

                            <div className="flex items-start gap-3 mt-2">
                              <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${config.badge}`}
                                >
                                  {config.label}
                                </span>
                                <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
                                  {event.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {event.description}
                                </p>
                                {event.date && (
                                  <p className="text-[10px] text-muted-foreground/70 mt-2">
                                    {formatDate(event.date)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
