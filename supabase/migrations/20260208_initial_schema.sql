-- FullCourtVision schema - migrated from SQLite

-- Organisations
CREATE TABLE organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  tenant TEXT DEFAULT 'basketball-victoria',
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competitions
CREATE TABLE competitions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  name TEXT NOT NULL,
  type TEXT
);
CREATE INDEX idx_competitions_org ON competitions(organisation_id);

-- Seasons
CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT
);
CREATE INDEX idx_seasons_competition ON seasons(competition_id);

-- Grades
CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id),
  name TEXT NOT NULL,
  type TEXT
);
CREATE INDEX idx_grades_season ON grades(season_id);

-- Teams
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organisation_id TEXT REFERENCES organisations(id),
  season_id TEXT REFERENCES seasons(id)
);
CREATE INDEX idx_teams_org ON teams(organisation_id);
CREATE INDEX idx_teams_season ON teams(season_id);
CREATE INDEX idx_teams_name ON teams(name);

-- Players
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_players_name ON players(last_name, first_name);
CREATE INDEX idx_players_first_name ON players(first_name);

-- Player Stats
CREATE TABLE player_stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  grade_id TEXT NOT NULL REFERENCES grades(id),
  team_name TEXT,
  games_played INT DEFAULT 0,
  total_points INT DEFAULT 0,
  one_point INT DEFAULT 0,
  two_point INT DEFAULT 0,
  three_point INT DEFAULT 0,
  total_fouls INT DEFAULT 0,
  ranking INT,
  UNIQUE(player_id, grade_id)
);
CREATE INDEX idx_player_stats_player ON player_stats(player_id);
CREATE INDEX idx_player_stats_grade ON player_stats(grade_id);
CREATE INDEX idx_player_stats_total_points ON player_stats(total_points DESC);
CREATE INDEX idx_player_stats_games ON player_stats(games_played DESC);

-- Rounds
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL REFERENCES grades(id),
  name TEXT NOT NULL,
  number INT,
  provisional_date DATE,
  is_finals BOOLEAN DEFAULT false
);
CREATE INDEX idx_rounds_grade ON rounds(grade_id);

-- Games
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  grade_id TEXT REFERENCES grades(id),
  round_id TEXT,
  round_name TEXT,
  home_team_id TEXT,
  away_team_id TEXT,
  home_score INT,
  away_score INT,
  date DATE,
  time TEXT,
  venue TEXT,
  court TEXT,
  status TEXT
);
CREATE INDEX idx_games_grade ON games(grade_id);
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);

-- Ladder
CREATE TABLE ladder (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grade_id TEXT NOT NULL REFERENCES grades(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  position INT,
  played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  points_for INT DEFAULT 0,
  points_against INT DEFAULT 0,
  percentage REAL DEFAULT 0,
  points INT DEFAULT 0,
  UNIQUE(grade_id, team_id)
);
CREATE INDEX idx_ladder_grade ON ladder(grade_id);

-- Scrape Log
CREATE TABLE scrape_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error TEXT
);

-- Enable RLS on all tables with public read
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON organisations FOR SELECT USING (true);
CREATE POLICY "Public read" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public read" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read" ON grades FOR SELECT USING (true);
CREATE POLICY "Public read" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read" ON players FOR SELECT USING (true);
CREATE POLICY "Public read" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Public read" ON rounds FOR SELECT USING (true);
CREATE POLICY "Public read" ON games FOR SELECT USING (true);
CREATE POLICY "Public read" ON ladder FOR SELECT USING (true);
CREATE POLICY "Public read" ON scrape_log FOR SELECT USING (true);
