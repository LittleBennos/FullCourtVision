import Database from 'better-sqlite3';
import { join } from 'path';

// Connect to the SQLite database
const dbPath = join(process.cwd(), '..', 'data', 'playhq.db');
const db = new Database(dbPath, { readonly: true });

export interface RisingStar {
  player_id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  organisation_name: string;
  previous_season_ppg: number;
  current_season_ppg: number;
  improvement: number;
  previous_season_games: number;
  current_season_games: number;
  previous_season_name: string;
  current_season_name: string;
}

export function getRisingStars(): RisingStar[] {
  const query = `
    WITH player_season_stats AS (
      SELECT 
        ps.player_id,
        p.first_name,
        p.last_name,
        ps.team_name,
        o.name as organisation_name,
        s.name as season_name,
        s.start_date,
        ps.games_played,
        CAST(ps.total_points AS FLOAT) / NULLIF(ps.games_played, 0) as ppg,
        -- Rank seasons by start date for each player
        ROW_NUMBER() OVER (PARTITION BY ps.player_id ORDER BY s.start_date DESC) as season_rank
      FROM player_stats ps
      INNER JOIN players p ON ps.player_id = p.id
      INNER JOIN grades g ON ps.grade_id = g.id
      INNER JOIN seasons s ON g.season_id = s.id
      INNER JOIN competitions c ON s.competition_id = c.id
      INNER JOIN organisations o ON c.organisation_id = o.id
      WHERE ps.games_played >= 5 
        AND s.start_date IS NOT NULL
        AND ps.total_points > 0
    ),
    player_latest_seasons AS (
      SELECT 
        player_id,
        MAX(CASE WHEN season_rank = 1 THEN season_name END) as current_season_name,
        MAX(CASE WHEN season_rank = 1 THEN ppg END) as current_season_ppg,
        MAX(CASE WHEN season_rank = 1 THEN games_played END) as current_season_games,
        MAX(CASE WHEN season_rank = 1 THEN team_name END) as team_name,
        MAX(CASE WHEN season_rank = 1 THEN organisation_name END) as organisation_name,
        MAX(CASE WHEN season_rank = 1 THEN first_name END) as first_name,
        MAX(CASE WHEN season_rank = 1 THEN last_name END) as last_name,
        MAX(CASE WHEN season_rank = 2 THEN season_name END) as previous_season_name,
        MAX(CASE WHEN season_rank = 2 THEN ppg END) as previous_season_ppg,
        MAX(CASE WHEN season_rank = 2 THEN games_played END) as previous_season_games
      FROM player_season_stats
      WHERE season_rank IN (1, 2)
      GROUP BY player_id
      HAVING current_season_ppg IS NOT NULL 
        AND previous_season_ppg IS NOT NULL
        AND current_season_games >= 5
        AND previous_season_games >= 5
    )
    SELECT 
      player_id,
      first_name,
      last_name,
      team_name,
      organisation_name,
      previous_season_ppg,
      current_season_ppg,
      ROUND(current_season_ppg - previous_season_ppg, 1) as improvement,
      previous_season_games,
      current_season_games,
      previous_season_name,
      current_season_name
    FROM player_latest_seasons
    WHERE improvement > 0
    ORDER BY improvement DESC
    LIMIT 50
  `;

  const stmt = db.prepare(query);
  return stmt.all() as RisingStar[];
}

// Export the database connection for any other queries that might be needed
export { db };