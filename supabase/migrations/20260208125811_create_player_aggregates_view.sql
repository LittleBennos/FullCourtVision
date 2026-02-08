-- Create a view for pre-aggregated player stats
-- This avoids downloading 380k+ rows on every page load
CREATE OR REPLACE VIEW player_aggregates AS
SELECT
  ps.player_id,
  p.first_name,
  p.last_name,
  COALESCE(SUM(ps.games_played), 0)::int AS total_games,
  COALESCE(SUM(ps.total_points), 0)::int AS total_points,
  COALESCE(SUM(ps.three_point), 0)::int AS total_threes,
  CASE WHEN COALESCE(SUM(ps.games_played), 0) > 0
    THEN ROUND(SUM(ps.total_points)::numeric / SUM(ps.games_played), 1)
    ELSE 0
  END AS ppg
FROM player_stats ps
JOIN players p ON p.id = ps.player_id
GROUP BY ps.player_id, p.first_name, p.last_name;

-- Grant access to the view
GRANT SELECT ON player_aggregates TO anon, authenticated;
