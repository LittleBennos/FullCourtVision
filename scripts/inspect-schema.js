const db = require('better-sqlite3')('data/playhq.db');
const tables = db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(t.sql + ';\n'));

// Row counts
const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\n--- ROW COUNTS ---');
tableNames.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get();
  console.log(`${t.name}: ${count.c}`);
});
