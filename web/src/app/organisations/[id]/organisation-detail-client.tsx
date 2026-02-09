"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, MapPin, Globe, Users, Trophy, Target, Crown, BarChart3 } from "lucide-react";
import type { Organisation, Team } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface OrganisationDetailProps {
  organisation: Organisation;
  teams: Team[];
  players: Array<{
    id: string;
    first_name: string;
    last_name: string;
    total_games: number;
    total_points: number;
    ppg: number;
    team_name: string;
  }>;
  stats: {
    total_teams: number;
    total_players: number;
    total_games: number;
    top_scorer: { name: string; points: number } | null;
  };
}

export function OrganisationDetailClient({ 
  organisation, 
  teams, 
  players, 
  stats 
}: OrganisationDetailProps) {
  const [activeTab, setActiveTab] = useState<"teams" | "players">("teams");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Organisations", href: "/organisations" },
        { label: organisation.name },
      ]} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{organisation.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {organisation.type && (
                <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
                  {organisation.type}
                </span>
              )}
              {organisation.suburb && organisation.state && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {organisation.suburb}, {organisation.state}
                </div>
              )}
              <Link
                href={`/organisations/${organisation.id}/analytics`}
                className="flex items-center gap-1 text-accent hover:underline"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Link>
              {organisation.website && (
                <a
                  href={organisation.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Teams"
          value={stats.total_teams.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Players"
          value={stats.total_players.toLocaleString()}
          icon={Target}
        />
        <StatCard
          label="Total Games"
          value={stats.total_games.toLocaleString()}
          icon={Trophy}
        />
        <StatCard
          label="Top Scorer"
          value={stats.top_scorer ? `${stats.top_scorer.name} (${stats.top_scorer.points}pts)` : "No data"}
          icon={Crown}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "teams"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "players"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Players ({players.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "teams" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Team</th>
                <th className="text-left px-4 py-3 font-medium">Season</th>
                <th className="text-right px-4 py-3 font-medium">W</th>
                <th className="text-right px-4 py-3 font-medium">L</th>
                <th className="text-right px-4 py-3 font-medium">GP</th>
                <th className="text-right px-4 py-3 font-medium">Win%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No teams found for this organisation
                  </td>
                </tr>
              ) : (
                teams.map((team) => {
                  const winPercentage = team.games_played > 0 ? (team.wins / team.games_played * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={team.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/teams/${team.id}`} className="text-accent hover:underline font-medium">
                          {team.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{team.season_name || "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-400">{team.wins}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-400">{team.losses}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{team.games_played}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{winPercentage}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "players" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Player</th>
                <th className="text-left px-4 py-3 font-medium">Teams</th>
                <th className="text-right px-4 py-3 font-medium">Games</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">PPG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No players found for this organisation
                  </td>
                </tr>
              ) : (
                players.slice(0, 100).map((player) => (
                  <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/players/${player.id}`} className="text-accent hover:underline font-medium">
                        {player.first_name} {player.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{player.team_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{player.total_games}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent">{player.total_points}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{player.ppg}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {players.length > 100 && (
            <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
              Showing top 100 players by total points
            </div>
          )}
        </div>
      )}
    </div>
  );
}