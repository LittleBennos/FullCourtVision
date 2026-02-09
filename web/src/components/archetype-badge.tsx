"use client";

const ARCHETYPES = {
  "Sharpshooter": { icon: "🎯", color: "#ffc300", bg: "rgba(255,195,0,0.15)", border: "rgba(255,195,0,0.4)" },
  "Inside Scorer": { icon: "💪", color: "#e94560", bg: "rgba(233,69,96,0.15)", border: "rgba(233,69,96,0.4)" },
  "High Volume": { icon: "🔥", color: "#00d2ff", bg: "rgba(0,210,255,0.15)", border: "rgba(0,210,255,0.4)" },
  "Physical": { icon: "🛡️", color: "#7b2ff7", bg: "rgba(123,47,247,0.15)", border: "rgba(123,47,247,0.4)" },
  "Balanced": { icon: "⚖️", color: "#2ecc71", bg: "rgba(46,204,113,0.15)", border: "rgba(46,204,113,0.4)" },
} as const;

type ArchetypeName = keyof typeof ARCHETYPES;

/**
 * Compute a player archetype from per-game stats using simple thresholds.
 * Priority order prevents overlapping assignments.
 */
export function computeArchetype(ppg: number, threePtPg: number, twoPtPg: number, foulsPg: number): ArchetypeName {
  // High Volume: top scorers
  if (ppg >= 15) return "High Volume";
  // Sharpshooter: relies on 3s (>40% of field goals are 3s, or high 3pt volume)
  if (threePtPg >= 2 && threePtPg > twoPtPg * 0.6) return "Sharpshooter";
  // Physical: high foul rate relative to scoring
  if (foulsPg >= 3 || (foulsPg >= 2 && ppg < 8)) return "Physical";
  // Inside Scorer: dominated by 2pt
  if (twoPtPg >= 3 && twoPtPg > threePtPg * 2) return "Inside Scorer";
  // Default
  return "Balanced";
}

interface ArchetypeBadgeProps {
  ppg: number;
  threePtPg: number;
  twoPtPg: number;
  foulsPg: number;
}

export function ArchetypeBadge({ ppg, threePtPg, twoPtPg, foulsPg }: ArchetypeBadgeProps) {
  const name = computeArchetype(ppg, threePtPg, twoPtPg, foulsPg);
  const style = ARCHETYPES[name];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
      style={{
        color: style.color,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
      title={`Player archetype: ${name}`}
    >
      <span>{style.icon}</span>
      {name}
    </span>
  );
}
