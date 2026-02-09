import { NotFoundSuggestions } from "@/components/not-found-suggestions";
import { getSimilarPlayers } from "@/lib/suggestions";

export default async function PlayerNotFound() {
  const suggestions = await getSimilarPlayers(5);

  return (
    <NotFoundSuggestions
      entity="Player"
      entityPlural="Players"
      listHref="/players"
      suggestions={suggestions}
    />
  );
}
