import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { OrganisationsClient } from "./organisations-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata = {
  title: "Organisations",
  description: "Browse all basketball organisations across Victoria, Australia. View teams, players, and club statistics.",
};

export const revalidate = 3600;

export default async function OrganisationsPage() {
  // Fetch organisations
  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name, type, suburb, state, website")
    .order("name");

  // Fetch team counts per org
  const { data: teams } = await supabase
    .from("teams")
    .select("organisation_id");

  // Count teams per org
  const teamCounts = new Map<string, number>();
  for (const t of teams || []) {
    teamCounts.set(t.organisation_id, (teamCounts.get(t.organisation_id) || 0) + 1);
  }

  const enriched = (orgs || []).map(o => ({
    ...o,
    team_count: teamCounts.get(o.id) || 0,
  }));

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>}>
      <OrganisationsClient organisations={enriched} />
    </Suspense>
  );
}
