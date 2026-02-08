/**
 * Incremental sync from SQLite to Supabase.
 * Can be called as a module (syncToSupabase()) or run directly.
 * Uses upserts so only new/changed records are updated.
 */
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const SUPABASE_URL = 'https://fcizsxlgckwjnuhlqhwc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjaXpzeGxnY2t3am51aGxxaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMjkwMiwiZXhwIjoyMDg2MTA4OTAyfQ.4Rr9uyqa2pkcQEQ_Jvu2Me34kGYCziY0ZUiVGw4K7Vo';

const DB_PATH = path.join(__dirname, '..', 'data', 'playhq.db');
const BATCH = 1000;

async function batchUpsert(supabase, table, rows, { onConflict = 'id', transform = null } = {}) {
  if (!rows.length) { console.log(`  [supabase] ${table}: 0 rows, skip`); return 0; }
  const data = transform ? rows.map(transform) : rows;
  let upserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`  [supabase] ERROR ${table} batch ${i}:`, error.message);
      return upserted;
    }
    upserted += batch.length;
  }
  console.log(`  [supabase] ${table}: ${upserted} rows synced`);
  return upserted;
}

async function syncToSupabase() {
  console.log('\n[supabase] Starting sync to Supabase...');
  const db = new Database(DB_PATH, { readonly: true });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const tables = [
    { name: 'organisations', sql: 'SELECT * FROM organisations' },
    { name: 'competitions', sql: 'SELECT * FROM competitions' },
    { name: 'seasons', sql: 'SELECT * FROM seasons' },
    { name: 'grades', sql: 'SELECT * FROM grades' },
    { name: 'teams', sql: 'SELECT * FROM teams' },
    { name: 'players', sql: 'SELECT * FROM players' },
    { name: 'player_stats',
      sql: 'SELECT player_id, grade_id, team_name, games_played, total_points, one_point, two_point, three_point, total_fouls, ranking FROM player_stats',
      onConflict: 'player_id,grade_id' },
    { name: 'rounds', sql: 'SELECT * FROM rounds',
      transform: r => ({ ...r, is_finals: !!r.is_finals }) },
    { name: 'games', sql: 'SELECT * FROM games' },
    { name: 'ladder',
      sql: 'SELECT grade_id, team_id, position, played, wins, losses, draws, points_for, points_against, percentage, points FROM ladder',
      onConflict: 'grade_id,team_id' },
    { name: 'scrape_log',
      sql: 'SELECT entity_type, entity_id, scraped_at, success, error FROM scrape_log',
      transform: r => ({ ...r, success: !!r.success }) },
  ];

  let totalRows = 0;
  for (const t of tables) {
    try {
      const rows = db.prepare(t.sql).all();
      totalRows += await batchUpsert(supabase, t.name, rows, {
        onConflict: t.onConflict,
        transform: t.transform,
      });
    } catch (e) {
      // Table might not exist in SQLite yet (e.g. ladder)
      if (e.message.includes('no such table')) {
        console.log(`  [supabase] ${t.name}: table not in SQLite, skip`);
      } else {
        throw e;
      }
    }
  }

  db.close();
  console.log(`[supabase] Sync complete (${totalRows} total rows)\n`);
  return totalRows;
}

module.exports = { syncToSupabase };

if (require.main === module) {
  syncToSupabase().catch(e => { console.error(e); process.exit(1); });
}
