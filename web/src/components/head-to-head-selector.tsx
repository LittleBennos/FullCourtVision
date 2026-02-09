"use client";

import { useState, useEffect } from "react";
import { Search, Users, X } from "lucide-react";
import Link from "next/link";
import { globalSearch, type GlobalSearchResults } from "@/lib/data";

interface HeadToHeadSelectorProps {
  teamId: string;
  teamName: string;
}

export function HeadToHeadSelector({ teamId, teamName }: HeadToHeadSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchTeams = async () => {
      if (searchQuery.length < 2) {
        setSearchResults(null);
        return;
      }

      setLoading(true);
      try {
        const results = await globalSearch(searchQuery, 10);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching teams:", error);
        setSearchResults(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchTeams, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const filteredTeams = searchResults?.teams.filter(team => team.id !== teamId) || [];

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Compare {teamName} vs...</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search for a team to compare against..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Searching...</div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Start typing to search for teams...
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No teams found. Try a different search term.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTeams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${teamId}/vs/${team.id}`}
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                      onClick={() => setIsOpen(false)}
                    >
                      <div>
                        <p className="font-medium">{team.name}</p>
                        {team.subtitle && (
                          <p className="text-sm text-muted-foreground">{team.subtitle}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors"
    >
      <Users className="w-4 h-4" />
      Head to Head
    </button>
  );
}