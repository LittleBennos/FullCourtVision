"use client";

import { RouteError } from "@/components/route-error";

export default function PlayersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      entity="player"
      entityPlural="Players"
      listHref="/players"
      error={error}
      reset={reset}
    />
  );
}
