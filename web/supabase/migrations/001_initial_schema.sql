-- FullCourtVision Schema
-- Basketball Victoria Analytics

CREATE TABLE organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  tenant TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id),
  name TEXT NOT NULL,
  type TEXT
);

CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  competition_id TEXT REFERENCES competitions(id),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT
);

CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  season_id TEXT REFERENCES seasons(id),
  name TEXT NOT NULL,
  type TEXT
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organisation_id TEXT REFERENCES organisations(id),
  season_id TEXT REFERENCES seasons(id)
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE player_stats (
  id SERIAL PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  grade_id TEXT REFERENCES grades(id),
  team_name TEXT,
  games_played INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  one_point INTEGER DEFAULT 0,
  two_point INTEGER DEFAULT 0,
  three_point INTEGER DEFAULT 0,
  total_fouls INTEGER DEFAULT 0,
  ranking INTEGER
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  grade_id TEXT REFERENCES grades(id),
  round_id TEXT,
  round_name TEXT,
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  date DATE,
  time TEXT,
  venue TEXT,
  court TEXT,
  status TEXT
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  grade_id TEXT REFERENCES grades(id),
  name TEXT,
  number INTEGER,
  provisional_date DATE,
  is_finals BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_player_stats_player ON player_stats(player_id);
CREATE INDEX idx_player_stats_grade ON player_stats(grade_id);
CREATE INDEX idx_games_grade ON games(grade_id);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_grades_season ON grades(season_id);
CREATE INDEX idx_seasons_competition ON seasons(competition_id);
CREATE INDEX idx_teams_org ON teams(organisation_id);
CREATE INDEX idx_teams_season ON teams(season_id);
CREATE INDEX idx_players_name ON players(last_name, first_name);

-- RLS: Enable and allow public read
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON organisations FOR SELECT USING (true);
CREATE POLICY "Public read" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public read" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read" ON grades FOR SELECT USING (true);
CREATE POLICY "Public read" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read" ON players FOR SELECT USING (true);
CREATE POLICY "Public read" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Public read" ON games FOR SELECT USING (true);
CREATE POLICY "Public read" ON rounds FOR SELECT USING (true);
