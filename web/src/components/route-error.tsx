"use client";

import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RouteErrorProps {
  entity: string;
  entityPlural: string;
  listHref: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ entity, entityPlural, listHref, error, reset }: RouteErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Error loading {entityPlural}
        </h1>
        <p className="text-slate-400 mb-6">
          We had trouble loading {entity} data. This is usually temporary — try again in a moment.
          {error.digest && (
            <span className="block text-xs text-slate-500 mt-2">Error ID: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href={listHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            All {entityPlural}
          </Link>
        </div>
      </div>
    </div>
  );
}
