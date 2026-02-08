import { getTeams } from "@/lib/data";
import { TeamsClient } from "./teams-client";

export const metadata = {
  title: "Teams",
  description: "Browse all basketball teams across Victoria. View records, rosters, and statistics.",
};

export const revalidate = 3600;

export default async function TeamsPage() {
  const teams = await getTeams();
  return <TeamsClient teams={teams} />;
}
