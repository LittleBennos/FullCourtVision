import { SearchClient } from "./search-client";

export const metadata = {
  title: "Search",
  description: "Search for players, teams, and organisations across Victorian basketball.",
};

export default function SearchPage() {
  return <SearchClient />;
}
