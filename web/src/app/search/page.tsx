import { getAllPlayers, getTeams, getOrganisations } from "@/lib/data";
import { SearchClient } from "./search-client";

export const metadata = {
  title: "Search — FullCourtVision",
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const [players, teams, organisations] = await Promise.all([
    getAllPlayers(),
    getTeams(),
    getOrganisations(),
  ]);
  return <SearchClient players={players} teams={teams} organisations={organisations} />;
}
