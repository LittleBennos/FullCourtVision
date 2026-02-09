"use client";

import { RouteError } from "@/components/route-error";

export default function GamesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      entity="game"
      entityPlural="Games"
      listHref="/games"
      error={error}
      reset={reset}
    />
  );
}
