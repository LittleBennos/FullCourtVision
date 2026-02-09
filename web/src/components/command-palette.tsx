"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Activity, Building2, ArrowRight, Command } from "lucide-react";
import { globalSearch, type GlobalSearchResults } from "@/lib/data";

function debounce(
  func: (q: string) => void,
  delay: number
): (q: string) => void {
  let timeoutId: NodeJS.Timeout;
  return (q: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(q), delay);
  };
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>({
    players: [],
    teams: [],
    organisations: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Build flat list of results for keyboard nav
  const flatResults: { type: string; id: string; name: string; subtitle?: string; href: string }[] = [];
  for (const p of results.players) flatResults.push({ type: "player", id: p.id, name: p.name, href: `/players/${p.id}` });
  for (const t of results.teams) flatResults.push({ type: "team", id: t.id, name: t.name, subtitle: t.subtitle, href: `/teams/${t.id}` });
  for (const o of results.organisations) flatResults.push({ type: "org", id: o.id, name: o.name, subtitle: o.subtitle, href: `/organisations/${o.id}` });

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ players: [], teams: [], organisations: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 2) {
        setResults({ players: [], teams: [], organisations: [] });
        setIsLoading(false);
        return;
      }
      try {
        const r = await globalSearch(q, 5);
        setResults(r);
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    }, 250),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsLoading(true);
    setSelectedIndex(0);
    debouncedSearch(e.target.value);
  };

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        navigate(flatResults[selectedIndex].href);
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const iconFor = (type: string) => {
    if (type === "player") return <Users className="w-4 h-4 text-blue-400" />;
    if (type === "team") return <Activity className="w-4 h-4 text-green-400" />;
    return <Building2 className="w-4 h-4 text-amber-400" />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-700">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search players, teams, organisations…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-slate-800 border border-slate-600 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading && query.length >= 2 && (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-5 h-5 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Searching…</p>
            </div>
          )}

          {!isLoading && query.length >= 2 && flatResults.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">No results for &quot;{query}&quot;</p>
            </div>
          )}

          {!isLoading && flatResults.length > 0 && (
            <ul className="py-2">
              {flatResults.map((item, idx) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === selectedIndex
                        ? "bg-blue-500/15 text-foreground"
                        : "text-muted-foreground hover:bg-slate-800"
                    }`}
                  >
                    {iconFor(item.type)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate text-foreground">{item.name}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length < 2 && (
            <div className="p-6 text-center text-muted-foreground">
              <Command className="w-5 h-5 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Type to search players, teams &amp; organisations</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {query.trim().length >= 2 && flatResults.length > 0 && (
          <div className="border-t border-slate-700 px-4 py-2.5">
            <button
              onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="flex items-center justify-between w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>View all results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
