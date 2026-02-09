"use client";

import { RouteError } from "@/components/route-error";

export default function OrganisationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      entity="organisation"
      entityPlural="Organisations"
      listHref="/organisations"
      error={error}
      reset={reset}
    />
  );
}
