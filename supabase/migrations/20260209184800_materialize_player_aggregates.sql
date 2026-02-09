-- Convert player_aggregates from a regular view to a materialized view
-- The regular view aggregates 380K+ rows on every query, causing timeouts on Vercel

DROP VIEW IF EXISTS player_aggregates;

CREATE MATERIALIZED VIEW player_aggregates AS
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

-- Indexes for fast lookups
CREATE UNIQUE INDEX idx_player_agg_player_id ON player_aggregates (player_id);
CREATE INDEX idx_player_agg_total_points ON player_aggregates (total_points DESC);
CREATE INDEX idx_player_agg_ppg ON player_aggregates (ppg DESC);
CREATE INDEX idx_player_agg_name ON player_aggregates (last_name, first_name);

-- Grant access
GRANT SELECT ON player_aggregates TO anon, authenticated;

-- Create a function to refresh the materialized view (call after scraper runs)
CREATE OR REPLACE FUNCTION refresh_player_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY player_aggregates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
