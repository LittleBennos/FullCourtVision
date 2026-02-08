import { json, OPTIONS } from "./helpers";

export { OPTIONS };

export async function GET() {
  return json({
    name: "FullCourtVision API",
    version: "1.0.0",
    description: "Public API for Australian basketball statistics",
    endpoints: {
      "GET /api/players": {
        description: "Search and list players",
        params: { search: "string", limit: "number (max 100, default 25)", offset: "number (default 0)" },
      },
      "GET /api/players/:id": {
        description: "Player profile with career stats",
      },
      "GET /api/players/:id/stats": {
        description: "Detailed season-by-season stats for a player",
      },
      "GET /api/teams": {
        description: "Search and list teams",
        params: { search: "string", org: "organisation_id", limit: "number (max 100, default 25)" },
      },
      "GET /api/teams/:id": {
        description: "Team details with roster and record",
      },
      "GET /api/leaderboards": {
        description: "Top players by stat",
        params: { stat: "ppg|points|games|threes (default ppg)", season: "season_id", limit: "number (max 100, default 25)" },
      },
      "GET /api/organisations": {
        description: "List all organisations",
      },
      "GET /api/search": {
        description: "Unified search across players, teams, and organisations",
        params: { q: "search query (min 2 chars)", limit: "number (max 20, default 5)" },
      },
    },
  });
}
