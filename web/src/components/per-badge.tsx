"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

interface PERData {
  per: number;
  percentile: number;
  rank: number;
  grade_rank: number;
  grade_total: number;
  grade_name: string;
}

function perColor(per: number): string {
  if (per >= 25) return "text-amber-400";
  if (per >= 20) return "text-green-400";
  if (per >= 15) return "text-blue-400";
  if (per >= 10) return "text-slate-300";
  return "text-slate-500";
}

function perBgColor(per: number): string {
  if (per >= 25) return "bg-amber-500/15 border-amber-500/30";
  if (per >= 20) return "bg-green-500/15 border-green-500/30";
  if (per >= 15) return "bg-blue-500/15 border-blue-500/30";
  return "bg-slate-500/10 border-slate-500/20";
}

function perLabel(per: number): string {
  if (per >= 30) return "MVP";
  if (per >= 25) return "Elite";
  if (per >= 20) return "All-Star";
  if (per >= 15) return "Above Avg";
  if (per >= 10) return "Average";
  if (per >= 5) return "Below Avg";
  return "Developing";
}

export function PERBadge({ playerId }: { playerId: string }) {
  const [data, setData] = useState<PERData | null>(null);

  useEffect(() => {
    fetch(`/api/analytics/per?player=${playerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.player) setData(d.player);
      })
      .catch(() => {});
  }, [playerId]);

  if (!data) return null;

  return (
    <Link
      href="/analytics/per"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 ${perBgColor(data.per)}`}
      title={`Player Efficiency Rating: ${data.per} — ${perLabel(data.per)} (Top ${100 - data.percentile}%)`}
    >
      <Zap className={`w-4 h-4 ${perColor(data.per)}`} />
      <span className={`font-bold text-sm ${perColor(data.per)}`}>{data.per}</span>
      <span className="text-xs text-muted-foreground">PER</span>
      <span className="text-xs text-muted-foreground">·</span>
      <span className="text-xs text-muted-foreground">
        Top {Math.max(1, 100 - data.percentile)}%
      </span>
      {data.grade_rank > 0 && (
        <>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            #{data.grade_rank} in grade
          </span>
        </>
      )}
    </Link>
  );
}
