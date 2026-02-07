const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'playhq.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS organisations (
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
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    );
    
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      competition_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      FOREIGN KEY (competition_id) REFERENCES competitions(id)
    );
    
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      FOREIGN KEY (season_id) REFERENCES seasons(id)
    );
    
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organisation_id TEXT,
      season_id TEXT,
      FOREIGN KEY (organisation_id) REFERENCES organisations(id),
      FOREIGN KEY (season_id) REFERENCES seasons(id)
    );
    
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      grade_id TEXT NOT NULL,
      team_name TEXT,
      games_played INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      one_point INTEGER DEFAULT 0,
      two_point INTEGER DEFAULT 0,
      three_point INTEGER DEFAULT 0,
      total_fouls INTEGER DEFAULT 0,
      ranking INTEGER,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      UNIQUE(player_id, grade_id)
    );
    
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      grade_id TEXT,
      round_id TEXT,
      round_name TEXT,
      home_team_id TEXT,
      away_team_id TEXT,
      home_score INTEGER,
      away_score INTEGER,
      date TEXT,
      time TEXT,
      venue TEXT,
      court TEXT,
      status TEXT,
      FOREIGN KEY (grade_id) REFERENCES grades(id)
    );
    
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      grade_id TEXT NOT NULL,
      name TEXT NOT NULL,
      number INTEGER,
      provisional_date TEXT,
      is_finals INTEGER DEFAULT 0,
      FOREIGN KEY (grade_id) REFERENCES grades(id)
    );
    
    CREATE TABLE IF NOT EXISTS ladder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      position INTEGER,
      played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0,
      points_against INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE(grade_id, team_id)
    );
    
    CREATE TABLE IF NOT EXISTS scrape_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      scraped_at TEXT DEFAULT (datetime('now')),
      success INTEGER DEFAULT 1,
      error TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_stats_grade ON player_stats(grade_id);
    CREATE INDEX IF NOT EXISTS idx_games_grade ON games(grade_id);
    CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
    CREATE INDEX IF NOT EXISTS idx_grades_season ON grades(season_id);
    CREATE INDEX IF NOT EXISTS idx_seasons_competition ON seasons(competition_id);
    CREATE INDEX IF NOT EXISTS idx_players_name ON players(last_name, first_name);
  `);
  
  db.close();
  console.log('Database initialized:', DB_PATH);
}

// Upsert helpers
function upsertOrganisation(db, org) {
  db.prepare(`INSERT OR REPLACE INTO organisations (id, name, type, email, phone, website, address, suburb, state, postcode, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(org.id, org.name, org.type, org.email, org.phone, org.website, org.address, org.suburb, org.state, org.postcode);
}

function upsertCompetition(db, comp) {
  db.prepare(`INSERT OR REPLACE INTO competitions (id, organisation_id, name, type) VALUES (?, ?, ?, ?)`)
    .run(comp.id, comp.organisation_id, comp.name, comp.type);
}

function upsertSeason(db, season) {
  db.prepare(`INSERT OR REPLACE INTO seasons (id, competition_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(season.id, season.competition_id, season.name, season.start_date, season.end_date, season.status);
}

function upsertGrade(db, grade) {
  db.prepare(`INSERT OR REPLACE INTO grades (id, season_id, name, type) VALUES (?, ?, ?, ?)`)
    .run(grade.id, grade.season_id, grade.name, grade.type);
}

function upsertTeam(db, team) {
  db.prepare(`INSERT OR REPLACE INTO teams (id, name, organisation_id, season_id) VALUES (?, ?, ?, ?)`)
    .run(team.id, team.name, team.organisation_id, team.season_id);
}

function upsertPlayer(db, player) {
  db.prepare(`INSERT OR REPLACE INTO players (id, first_name, last_name, updated_at) VALUES (?, ?, ?, datetime('now'))`)
    .run(player.id, player.first_name, player.last_name);
}

function upsertPlayerStats(db, stats) {
  db.prepare(`INSERT OR REPLACE INTO player_stats (player_id, grade_id, team_name, games_played, total_points, one_point, two_point, three_point, total_fouls, ranking)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(stats.player_id, stats.grade_id, stats.team_name, stats.games_played, stats.total_points, stats.one_point, stats.two_point, stats.three_point, stats.total_fouls, stats.ranking);
}

function upsertGame(db, game) {
  db.prepare(`INSERT OR REPLACE INTO games (id, grade_id, round_id, round_name, home_team_id, away_team_id, home_score, away_score, date, time, venue, court, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(game.id, game.grade_id, game.round_id, game.round_name, game.home_team_id, game.away_team_id, game.home_score, game.away_score, game.date, game.time, game.venue, game.court, game.status);
}

function upsertRound(db, round) {
  db.prepare(`INSERT OR REPLACE INTO rounds (id, grade_id, name, number, provisional_date, is_finals) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(round.id, round.grade_id, round.name, round.number, round.provisional_date, round.is_finals ? 1 : 0);
}

function logScrape(db, entityType, entityId, success = true, error = null) {
  db.prepare(`INSERT INTO scrape_log (entity_type, entity_id, success, error) VALUES (?, ?, ?, ?)`)
    .run(entityType, entityId, success ? 1 : 0, error);
}

// Query helpers
function getPlayer(db, playerId) {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
}

function getPlayerStats(db, playerId) {
  return db.prepare(`
    SELECT ps.*, g.name as grade_name, s.name as season_name, c.name as comp_name
    FROM player_stats ps
    JOIN grades g ON ps.grade_id = g.id
    JOIN seasons s ON g.season_id = s.id
    JOIN competitions c ON s.competition_id = c.id
    WHERE ps.player_id = ?
    ORDER BY s.start_date DESC
  `).all(playerId);
}

function searchPlayers(db, name) {
  return db.prepare(`SELECT * FROM players WHERE first_name LIKE ? OR last_name LIKE ?`)
    .all(`%${name}%`, `%${name}%`);
}

function getStats(db) {
  return {
    organisations: db.prepare('SELECT COUNT(*) as count FROM organisations').get().count,
    competitions: db.prepare('SELECT COUNT(*) as count FROM competitions').get().count,
    seasons: db.prepare('SELECT COUNT(*) as count FROM seasons').get().count,
    grades: db.prepare('SELECT COUNT(*) as count FROM grades').get().count,
    teams: db.prepare('SELECT COUNT(*) as count FROM teams').get().count,
    players: db.prepare('SELECT COUNT(*) as count FROM players').get().count,
    playerStats: db.prepare('SELECT COUNT(*) as count FROM player_stats').get().count,
    games: db.prepare('SELECT COUNT(*) as count FROM games').get().count,
  };
}

module.exports = {
  getDb, initDb, DB_PATH,
  upsertOrganisation, upsertCompetition, upsertSeason, upsertGrade,
  upsertTeam, upsertPlayer, upsertPlayerStats, upsertGame, upsertRound,
  logScrape, getPlayer, getPlayerStats, searchPlayers, getStats,
};

// Init if run directly
if (require.main === module) {
  initDb();
}
