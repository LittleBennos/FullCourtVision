const db = require('better-sqlite3')('data/playhq.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  const cnt = db.prepare(`SELECT COUNT(*) as c FROM [${t.name}]`).get();
  const cols = db.prepare(`PRAGMA table_info([${t.name}])`).all().map(c => c.name);
  console.log(`${t.name}: ${cnt.c} rows | ${JSON.stringify(cols)}`);
});
// Sample player_stats
console.log('\nSample player_stats:');
console.log(db.prepare('SELECT * FROM player_stats LIMIT 3').all());
// Sample fixtures
try { console.log('\nSample fixtures:'); console.log(db.prepare('SELECT * FROM fixtures LIMIT 3').all()); } catch(e) { console.log('No fixtures table'); }
