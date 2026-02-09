"use client";

import { useEffect, useState } from "react";
import type { Anomaly } from "@/lib/anomalies";

const severityColors = {
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  rare: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  notable: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

function AnomalyBadge({ anomaly }: { anomaly: Anomaly }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${severityColors[anomaly.severity]}`}
      >
        <span>{anomaly.emoji}</span>
        <span>{anomaly.label}</span>
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-sm">
          <p className="font-semibold text-white mb-1">{anomaly.label}</p>
          <p className="text-slate-300 text-xs">{anomaly.detail}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}

export function AnomalyBadges({ playerId }: { playerId: string }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${playerId}/anomalies`)
      .then((r) => r.json())
      .then((d) => setAnomalies(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading || anomalies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {anomalies.map((a, i) => (
        <AnomalyBadge key={`${a.type}-${i}`} anomaly={a} />
      ))}
    </div>
  );
}
