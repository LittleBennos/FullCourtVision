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
  return (
    <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4">
      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
