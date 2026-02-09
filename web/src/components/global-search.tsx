"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, Activity, Building2, ArrowRight } from "lucide-react";
import { globalSearch, type GlobalSearchResults } from "@/lib/data";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>({ 
    players: [], 
    teams: [], 
    organisations: [] 
  });
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults({ players: [], teams: [], organisations: [] });
        setIsLoading(false);
        return;
      }

      try {
        const searchResults = await globalSearch(searchQuery, 5);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsLoading(true);
    debouncedSearch(value);
  };

  // Handle search icon click
  const handleSearchClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      setResults({ players: [], teams: [], organisations: [] });
    } else if (e.key === "Enter" && query.trim()) {
      // Navigate to full search page
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results.players.length > 0 || results.teams.length > 0 || results.organisations.length > 0;
  const totalResults = results.players.length + results.teams.length + results.organisations.length;

  return (
    <div ref={searchRef} className="relative">
      {/* Search Icon/Input */}
      <div className="flex items-center">
        {!isOpen ? (
          <button
            onClick={handleSearchClick}
            className="flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-slate-800 border border-slate-600 rounded text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search players, teams..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-48 sm:w-80 pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] bg-card border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading && query.length >= 2 && (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="w-5 h-5 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Searching...</p>
            </div>
          )}

          {!isLoading && query.length >= 2 && !hasResults && (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="w-5 h-5 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!isLoading && hasResults && (
            <>
              {/* Players */}
              {results.players.length > 0 && (
                <div className="border-b border-border last:border-b-0">
                  <div className="px-4 py-2 bg-muted/30">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Players
                    </h3>
                  </div>
                  {results.players.map((player) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-medium text-foreground">{player.name}</div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Teams */}
              {results.teams.length > 0 && (
                <div className="border-b border-border last:border-b-0">
                  <div className="px-4 py-2 bg-muted/30">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      Teams
                    </h3>
                  </div>
                  {results.teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-medium text-foreground">{team.name}</div>
                      {team.subtitle && (
                        <div className="text-sm text-muted-foreground">{team.subtitle}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* Organizations */}
              {results.organisations.length > 0 && (
                <div className="border-b border-border last:border-b-0">
                  <div className="px-4 py-2 bg-muted/30">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      Organizations
                    </h3>
                  </div>
                  {results.organisations.map((org) => (
                    <Link
                      key={org.id}
                      href={`/organisations/${org.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-medium text-foreground">{org.name}</div>
                      {org.subtitle && (
                        <div className="text-sm text-muted-foreground">{org.subtitle}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* View All Results Link */}
              {query.trim() && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-accent hover:bg-accent/10 transition-colors border-t border-border"
                >
                  <span className="text-sm font-medium">
                    View all {totalResults > 15 ? "15+" : totalResults} results
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </>
          )}

          {query.length < 2 && (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="w-5 h-5 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}