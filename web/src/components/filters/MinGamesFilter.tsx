"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

const PRESETS = [0, 3, 5, 10, 20, 50];

export function MinGamesFilter({ value, onChange, className = "" }: Props) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-muted-foreground font-medium">Min. Games</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
      >
        {PRESETS.map((n) => (
          <option key={n} value={n}>{n === 0 ? "Any" : `${n}+`}</option>
        ))}
      </select>
    </div>
  );
}
