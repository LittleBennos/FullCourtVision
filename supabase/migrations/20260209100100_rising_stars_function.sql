CREATE OR REPLACE FUNCTION get_rising_stars()
RETURNS TABLE (
  player_id TEXT,
  first_name TEXT,
  last_name TEXT,
  team_name TEXT,
  organisation_name TEXT,
  previous_season_ppg FLOAT,
  current_season_ppg FLOAT,
  improvement FLOAT,
  previous_season_games INT,
  current_season_games INT,
  previous_season_name TEXT,
  current_season_name TEXT
) LANGUAGE sql STABLE AS $$
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
      MAX(CASE WHEN season_rank = 1 THEN games_played END)::INT as current_season_games,
      MAX(CASE WHEN season_rank = 1 THEN team_name END) as team_name,
      MAX(CASE WHEN season_rank = 1 THEN organisation_name END) as organisation_name,
      MAX(CASE WHEN season_rank = 1 THEN first_name END) as first_name,
      MAX(CASE WHEN season_rank = 1 THEN last_name END) as last_name,
      MAX(CASE WHEN season_rank = 2 THEN season_name END) as previous_season_name,
      MAX(CASE WHEN season_rank = 2 THEN ppg END) as previous_season_ppg,
      MAX(CASE WHEN season_rank = 2 THEN games_played END)::INT as previous_season_games
    FROM player_season_stats
    WHERE season_rank IN (1, 2)
    GROUP BY player_id
    HAVING MAX(CASE WHEN season_rank = 1 THEN ppg END) IS NOT NULL
      AND MAX(CASE WHEN season_rank = 2 THEN ppg END) IS NOT NULL
      AND MAX(CASE WHEN season_rank = 1 THEN games_played END) >= 5
      AND MAX(CASE WHEN season_rank = 2 THEN games_played END) >= 5
  )
  SELECT 
    player_id,
    first_name,
    last_name,
    team_name,
    organisation_name,
    previous_season_ppg,
    current_season_ppg,
    ROUND((current_season_ppg - previous_season_ppg)::NUMERIC, 1)::FLOAT as improvement,
    previous_season_games,
    current_season_games,
    previous_season_name,
    current_season_name
  FROM player_latest_seasons
  WHERE current_season_ppg - previous_season_ppg > 0
  ORDER BY improvement DESC
  LIMIT 50;
$$;
