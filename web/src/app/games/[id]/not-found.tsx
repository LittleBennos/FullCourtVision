import { NotFoundSuggestions } from "@/components/not-found-suggestions";
import { getSimilarGames } from "@/lib/suggestions";

export default async function GameNotFound() {
  const suggestions = await getSimilarGames(5);

  return (
    <NotFoundSuggestions
      entity="Game"
      entityPlural="Games"
      listHref="/games"
      suggestions={suggestions}
    />
  );
}
