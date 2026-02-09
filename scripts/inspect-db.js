const db = require('better-sqlite3')('./data/playhq.db');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  console.log(t.sql);
  const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
  console.log(`  -> ${t.name}: ${count.c} rows\n`);
}
