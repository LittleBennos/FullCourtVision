import { type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;
  
  return (
    <div 
      className="bg-card rounded-xl border border-border p-6 flex items-center gap-4"
      role="group"
      aria-label={`${label}: ${formattedValue}`}
    >
      <div 
        className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold" aria-label={`Value: ${formattedValue}`}>
          {formattedValue}
        </p>
        <p className="text-sm text-muted-foreground" id={`label-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {label}
        </p>
      </div>
    </div>
  );
}
