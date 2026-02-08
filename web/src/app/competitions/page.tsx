import { getCompetitions, getSeasons } from "@/lib/data";
import Link from "next/link";

export const metadata = {
  title: "Competitions",
  description: "Browse all basketball competitions across Victoria, Australia. Filter by season and view grades.",
};

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const [competitions, seasons] = await Promise.all([getCompetitions(), getSeasons()]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Competitions</h1>
      <p className="text-muted-foreground mb-8">
        {competitions.length} competitions · {seasons.length} seasons
      </p>

      <div className="space-y-4">
        {competitions.map((comp) => {
          const compSeasons = seasons.filter((s) => s.competition_id === comp.id);
          return (
            <div key={comp.id} className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold">{comp.name}</h2>
                  <p className="text-sm text-muted-foreground">{comp.org_name || "Unknown Org"}</p>
                </div>
                {comp.type && (
                  <span className="px-2 py-1 text-xs bg-accent/10 text-accent rounded-full">{comp.type}</span>
                )}
              </div>
              {compSeasons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {compSeasons.slice(0, 8).map((s) => (
                    <span key={s.id} className="px-2.5 py-1 text-xs bg-muted rounded-lg">
                      {s.name}
                    </span>
                  ))}
                  {compSeasons.length > 8 && (
                    <span className="px-2.5 py-1 text-xs text-muted-foreground">
                      +{compSeasons.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
