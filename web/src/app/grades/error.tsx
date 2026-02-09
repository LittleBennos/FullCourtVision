"use client";

import { RouteError } from "@/components/route-error";

export default function GradesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      entity="grade"
      entityPlural="Grades"
      listHref="/grades"
      error={error}
      reset={reset}
    />
  );
}
