import { NotFoundSuggestions } from "@/components/not-found-suggestions";
import { getSimilarGrades } from "@/lib/suggestions";

export default async function GradeNotFound() {
  const suggestions = await getSimilarGrades(5);

  return (
    <NotFoundSuggestions
      entity="Grade"
      entityPlural="Grades"
      listHref="/grades"
      suggestions={suggestions}
    />
  );
}
