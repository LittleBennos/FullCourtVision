const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fcizsxlgckwjnuhlqhwc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjaXpzeGxnY2t3am51aGxxaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMjkwMiwiZXhwIjoyMDg2MTA4OTAyfQ.4Rr9uyqa2pkcQEQ_Jvu2Me34kGYCziY0ZUiVGw4K7Vo';

const db = new Database('data/playhq.db', { readonly: true });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BATCH = 1000;

async function batchInsert(table, rows, transform) {
  if (!rows.length) { console.log(`  ${table}: 0 rows, skipping`); return; }
  const data = transform ? rows.map(transform) : rows;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: table === 'player_stats' ? 'player_id,grade_id' : table === 'ladder' ? 'grade_id,team_id' : 'id' });
    if (error) { console.error(`  ERROR in ${table} batch ${i}:`, error.message); return; }
    inserted += batch.length;
    if (inserted % 10000 === 0 || inserted === data.length) console.log(`  ${table}: ${inserted}/${data.length}`);
  }
  console.log(`  ${table}: done (${inserted})`);
}

async function main() {
  console.log('Starting import...\n');

  // Order matters for foreign keys
  const tables = [
    { name: 'organisations', sql: 'SELECT * FROM organisations' },
    { name: 'competitions', sql: 'SELECT * FROM competitions' },
    { name: 'seasons', sql: 'SELECT * FROM seasons' },
    { name: 'grades', sql: 'SELECT * FROM grades' },
    { name: 'teams', sql: 'SELECT * FROM teams' },
    { name: 'players', sql: 'SELECT * FROM players' },
    { name: 'player_stats', sql: 'SELECT player_id, grade_id, team_name, games_played, total_points, one_point, two_point, three_point, total_fouls, ranking FROM player_stats',
      transform: r => r },
    { name: 'rounds', sql: 'SELECT * FROM rounds', transform: r => ({ ...r, is_finals: !!r.is_finals }) },
    { name: 'games', sql: 'SELECT * FROM games' },
    { name: 'ladder', sql: 'SELECT grade_id, team_id, position, played, wins, losses, draws, points_for, points_against, percentage, points FROM ladder',
      transform: r => r },
    { name: 'scrape_log', sql: 'SELECT entity_type, entity_id, scraped_at, success, error FROM scrape_log',
      transform: r => ({ ...r, success: !!r.success }) },
  ];

  for (const t of tables) {
    const rows = db.prepare(t.sql).all();
    await batchInsert(t.name, rows, t.transform);
  }

  console.log('\nImport complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
