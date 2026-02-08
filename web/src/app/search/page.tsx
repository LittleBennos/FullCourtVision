import { getAllPlayers, getTeams, getOrganisations } from "@/lib/data";
import { SearchClient } from "./search-client";

export const metadata = {
  title: "Search",
  description: "Search for players, teams, and organisations across Victorian basketball.",
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
