import stats from "@/data/stats.json";
import topPlayers from "@/data/top_players.json";
import allPlayers from "@/data/all_players.json";
import organisations from "@/data/organisations.json";
import teams from "@/data/teams.json";
import competitions from "@/data/competitions.json";
import seasons from "@/data/seasons.json";
import leaderboards from "@/data/leaderboards.json";
import playerDetails from "@/data/player_details.json";

export type Stats = typeof stats;
export type Player = (typeof allPlayers)[0];
export type TopPlayer = (typeof topPlayers)[0];
export type Team = (typeof teams)[0];
export type Organisation = (typeof organisations)[0];
export type Competition = (typeof competitions)[0];
export type Season = (typeof seasons)[0];

export function getStats() {
  return stats;
}

export function getAllPlayers() {
  return allPlayers as Player[];
}

export function getTopPlayers() {
  return topPlayers as TopPlayer[];
}

export function getOrganisations() {
  return organisations as Organisation[];
}

export function getTeams() {
  return teams as Team[];
}

export function getCompetitions() {
  return competitions as Competition[];
}

export function getSeasons() {
  return seasons as Season[];
}

export function getLeaderboards() {
  return leaderboards as { ppg: any[]; games: any[]; threes: any[] };
}

export function getPlayerDetails(id: string) {
  const details = playerDetails as Record<string, { player: any; stats: any[] }>;
  if (details[id]) return details[id];
  // Fallback: find in allPlayers for basic info (no per-season stats)
  const basic = allPlayers.find((p) => p.id === id);
  if (basic) {
    return {
      player: { id: basic.id, first_name: basic.first_name, last_name: basic.last_name },
      stats: [],
    };
  }
  return null;
}

export function getTeamById(id: string) {
  return teams.find((t) => t.id === id) || null;
}
