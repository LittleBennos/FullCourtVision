-- Team aggregates view: wins, losses, games played computed server-side
CREATE OR REPLACE VIEW team_aggregates AS
SELECT
  t.id AS team_id,
  t.name,
  t.organisation_id,
  t.season_id,
  o.name AS organisation_name,
  s.name AS season_name,
  COALESCE(agg.wins, 0) AS wins,
  COALESCE(agg.losses, 0) AS losses,
  COALESCE(agg.gp, 0) AS gp
FROM teams t
LEFT JOIN organisations o ON o.id = t.organisation_id
LEFT JOIN seasons s ON s.id = t.season_id
LEFT JOIN (
  SELECT
    team_id,
    COUNT(*) AS gp,
    SUM(CASE WHEN won THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN NOT won THEN 1 ELSE 0 END) AS losses
  FROM (
    SELECT home_team_id AS team_id, home_score > away_score AS won
    FROM games WHERE home_score IS NOT NULL AND away_score IS NOT NULL
    UNION ALL
    SELECT away_team_id AS team_id, away_score > home_score AS won
    FROM games WHERE home_score IS NOT NULL AND away_score IS NOT NULL
  ) sub
  GROUP BY team_id
) agg ON agg.team_id = t.id;
