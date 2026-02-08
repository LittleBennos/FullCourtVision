import { getTeams } from "@/lib/data";
import { TeamsClient } from "./teams-client";

export const metadata = {
  title: "Teams — FullCourtVision",
};

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await getTeams();
  return <TeamsClient teams={teams} />;
}
