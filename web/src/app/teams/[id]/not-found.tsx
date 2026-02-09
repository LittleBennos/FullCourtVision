import { NotFoundSuggestions } from "@/components/not-found-suggestions";
import { getSimilarTeams } from "@/lib/suggestions";

export default async function TeamNotFound() {
  const suggestions = await getSimilarTeams(5);

  return (
    <NotFoundSuggestions
      entity="Team"
      entityPlural="Teams"
      listHref="/teams"
      suggestions={suggestions}
    />
  );
}
