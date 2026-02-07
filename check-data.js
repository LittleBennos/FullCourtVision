const db = require('better-sqlite3')('data/playhq.db');

console.log('\n=== SEASONS ===');
const seasons = db.prepare('SELECT DISTINCT season_name, COUNT(DISTINCT player_id) as players, COUNT(*) as stats FROM player_stats GROUP BY season_name').all();
console.table(seasons);

console.log('\n=== ORGANISATIONS ===');
const orgs = db.prepare('SELECT COUNT(*) as total FROM organisations').get();
console.log('Total orgs catalogued:', orgs.total);

// Check if competitions table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('Tables:', tables.join(', '));

if (tables.includes('competitions')) {
  const comps = db.prepare('SELECT COUNT(*) as total FROM competitions').get();
  console.log('Competitions:', comps.total);
}

if (tables.includes('grades')) {
  const grades = db.prepare('SELECT COUNT(*) as total FROM grades').get();
  const scraped = db.prepare("SELECT COUNT(*) as done FROM grades WHERE scraped = 1").get();
  console.log('Grades total:', grades.total, '| Scraped:', scraped.done);
}

console.log('\n=== COVERAGE ===');
const players = db.prepare('SELECT COUNT(DISTINCT player_id) as total FROM player_stats').get();
const games = db.prepare('SELECT COUNT(DISTINCT game_id) as total FROM player_stats').get();
console.log('Unique players:', players.total);
console.log('Unique games:', games.total);

// Check which orgs we've actually scraped
if (tables.includes('scrape_log')) {
  const orgsScraped = db.prepare('SELECT COUNT(DISTINCT org_id) as total FROM scrape_log').get();
  console.log('Orgs scraped:', orgsScraped.total, 'of', orgs.total);
}

// EDJBA only or more?
const orgCheck = db.prepare("SELECT DISTINCT organisation_name FROM player_stats LIMIT 10").all();
console.log('\nOrgs in player data:', orgCheck.map(o => o.organisation_name));
