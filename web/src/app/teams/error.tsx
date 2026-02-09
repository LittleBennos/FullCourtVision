"use client";

import { RouteError } from "@/components/route-error";

export default function TeamsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      entity="team"
      entityPlural="Teams"
      listHref="/teams"
      error={error}
      reset={reset}
    />
  );
}
