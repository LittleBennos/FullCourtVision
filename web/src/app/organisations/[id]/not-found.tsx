import { NotFoundSuggestions } from "@/components/not-found-suggestions";
import { getSimilarOrganisations } from "@/lib/suggestions";

export default async function OrganisationNotFound() {
  const suggestions = await getSimilarOrganisations(5);

  return (
    <NotFoundSuggestions
      entity="Organisation"
      entityPlural="Organisations"
      listHref="/organisations"
      suggestions={suggestions}
    />
  );
}
