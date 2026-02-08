"use client";

import { useState, useEffect } from "react";
import { searchGrades, getSeasons, getCompetitions, getOrganisations } from "@/lib/data";
import type { Grade, Season, Competition, Organisation } from "@/lib/data";
import { Search, Filter, Calendar, Trophy, Building } from "lucide-react";
import Link from "next/link";

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [gradesData, seasonsData, competitionsData, orgsData] = await Promise.all([
          searchGrades({}),
          getSeasons(),
          getCompetitions(),
          getOrganisations(),
        ]);
        
        setGrades(gradesData);
        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setOrganisations(orgsData);
      } catch (error) {
        console.error("Error loading grades data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    async function applyFilters() {
      if (loading) return;
      
      setLoading(true);
      try {
        const filteredGrades = await searchGrades({
          search: search || undefined,
          seasonId: selectedSeason || undefined,
          competitionId: selectedCompetition || undefined,
          orgId: selectedOrg || undefined,
        });
        setGrades(filteredGrades);
      } catch (error) {
        console.error("Error filtering grades:", error);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(applyFilters, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedSeason, selectedCompetition, selectedOrg]);

  const clearFilters = () => {
    setSearch("");
    setSelectedSeason("");
    setSelectedCompetition("");
    setSelectedOrg("");
  };

  const hasActiveFilters = search || selectedSeason || selectedCompetition || selectedOrg;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Grades & Competitions</h1>
        <p className="text-muted-foreground">
          Browse basketball grades across all seasons and competitions. View standings, top scorers, and fixtures.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search grades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
              >
                <option value="">All Seasons</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.competition_name && `(${season.competition_name})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Trophy className="w-4 h-4 inline mr-1" />
                Competition
              </label>
              <select
                value={selectedCompetition}
                onChange={(e) => setSelectedCompetition(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
              >
                <option value="">All Competitions</option>
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Organisation
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
              >
                <option value="">All Organisations</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {loading ? "Loading..." : `${grades.length} grade${grades.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Grades Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded mb-4 w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No grades found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? "Try adjusting your search criteria or clearing filters"
              : "There are no grades available at the moment"
            }
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grades.map((grade) => (
            <Link key={grade.id} href={`/grades/${grade.id}`}>
              <div className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-all hover:shadow-lg group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold group-hover:text-accent transition-colors line-clamp-2">
                    {grade.name}
                  </h3>
                  {grade.type && (
                    <span className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                      {grade.type}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{grade.competition_name}</p>
                  <p>{grade.season_name}</p>
                  <p className="text-xs">{grade.org_name}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-accent group-hover:underline">View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}