const Database = require('better-sqlite3');
const db = new Database('./data/playhq.db', { readonly: true });

console.log('Sample organisation names with patterns:');
const orgs = db.prepare('SELECT id, name FROM organisations LIMIT 50').all();
orgs.forEach(org => console.log(org.name));

console.log('\n\nCount by potential regions:');
// Try to extract geographic patterns
const patterns = {
  'Eltham': orgs.filter(o => o.name.toLowerCase().includes('eltham')).length,
  'Brighton': orgs.filter(o => o.name.toLowerCase().includes('brighton')).length,
  'Malvern': orgs.filter(o => o.name.toLowerCase().includes('malvern')).length,
  'Richmond': orgs.filter(o => o.name.toLowerCase().includes('richmond')).length,
  'Geelong': orgs.filter(o => o.name.toLowerCase().includes('geelong')).length,
  'Ballarat': orgs.filter(o => o.name.toLowerCase().includes('ballarat')).length,
  'Bendigo': orgs.filter(o => o.name.toLowerCase().includes('bendigo')).length,
  'Basketball Club': orgs.filter(o => o.name.toLowerCase().includes('basketball club')).length,
  'Total orgs': orgs.length
};

console.log(patterns);

// Also count players and games by organisation
console.log('\n\nPlayer counts by organisation (top 10):');
const playerCounts = db.prepare(`
  SELECT o.name, COUNT(DISTINCT ps.player_id) as player_count
  FROM organisations o
  INNER JOIN competitions c ON c.organisation_id = o.id  
  INNER JOIN seasons s ON s.competition_id = c.id
  INNER JOIN grades g ON g.season_id = s.id
  INNER JOIN player_stats ps ON ps.grade_id = g.id
  GROUP BY o.id, o.name
  ORDER BY player_count DESC
  LIMIT 10
`).all();

playerCounts.forEach(p => console.log(`${p.name}: ${p.player_count} players`));

db.close();