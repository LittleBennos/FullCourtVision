import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Suggestion {
  id: string;
  name: string;
  href: string;
}

interface NotFoundSuggestionsProps {
  entity: string;
  entityPlural: string;
  listHref: string;
  suggestions: Suggestion[];
}

export function NotFoundSuggestions({ entity, entityPlural, listHref, suggestions }: NotFoundSuggestionsProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-7xl font-black text-blue-400/20 mb-2">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {entity} not found
        </h1>
        <p className="text-slate-400 mb-8">
          This {entity.toLowerCase()} doesn&apos;t exist or may have been removed.
        </p>

        {suggestions.length > 0 && (
          <div className="mb-8 text-left">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Popular {entityPlural.toLowerCase()}
            </h2>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl divide-y divide-slate-800">
              {suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className="block px-4 py-3 text-slate-200 hover:text-blue-400 hover:bg-slate-800/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            href={listHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All {entityPlural}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
