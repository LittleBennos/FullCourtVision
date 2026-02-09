"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function getFreshnessColor(date: Date): { dot: string; text: string } {
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / 3600000;

  if (diffHours < 24) return { dot: "bg-green-500", text: "text-green-400" };
  if (diffHours < 72) return { dot: "bg-amber-500", text: "text-amber-400" };
  return { dot: "bg-red-500", text: "text-red-400" };
}

interface Props {
  variant?: "badge" | "dot";
}

export function DataFreshnessBadge({ variant = "badge" }: Props) {
  const [lastDate, setLastDate] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/data-freshness")
      .then((r) => r.json())
      .then((d) => {
        if (d.lastGameDate) setLastDate(new Date(d.lastGameDate));
      })
      .catch(() => {});
  }, []);

  if (!lastDate) return null;

  const colors = getFreshnessColor(lastDate);

  if (variant === "dot") {
    return (
      <div className="flex items-center gap-1.5" title={`Data updated ${getRelativeTime(lastDate)}`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
        <span className={`text-xs ${colors.text} hidden lg:inline`}>{getRelativeTime(lastDate)}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs ${colors.text}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>Data updated {getRelativeTime(lastDate)}</span>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
    </div>
  );
}
