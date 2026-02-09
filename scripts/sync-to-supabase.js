const Database = require('better-sqlite3');
const db = Database('./data/playhq.db');

const SUPABASE_URL = 'https://fcizsxlgckwjnuhlqhwc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjaXpzeGxnY2t3am51aGxxaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMjkwMiwiZXhwIjoyMDg2MTA4OTAyfQ.4Rr9uyqa2pkcQEQ_Jvu2Me34kGYCziY0ZUiVGw4K7Vo';

const baseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function upsertBatch(table, rows, prefer, queryParams = '') {
  if (!rows.length) return 0;
  const batchSize = 500;
  let total = 0;
  let errors = 0;
  const h = { ...baseHeaders, Prefer: prefer };
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${queryParams}`, {
      method: 'POST', headers: h, body: JSON.stringify(batch)
    });
    if (!res.ok) {
      errors++;
      if (errors <= 3) {
        const err = await res.text();
        console.error(`Error ${table} batch ${i}: ${err.slice(0,200)}`);
      }
    } else {
      total += batch.length;
    }
    if (i % 10000 === 0 && i > 0) process.stdout.write(`  ${i}...`);
  }
  if (errors > 3) console.error(`  ... and ${errors - 3} more batch errors`);
  return total;
}

async function getCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' }
  });
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1]) : -1;
}

(async () => {
  // Players: upsert on primary key (id)
  console.log('Syncing players...');
  const players = db.prepare('SELECT id, first_name, last_name, updated_at FROM players').all();
  console.log(`  ${await upsertBatch('players', players, 'resolution=merge-duplicates')} upserted`);

  // Player stats: ignore duplicates, use on_conflict query param for the unique constraint columns
  console.log('Syncing player_stats...');
  const stats = db.prepare('SELECT player_id, grade_id, team_name, games_played, total_points, one_point, two_point, three_point, total_fouls, ranking FROM player_stats').all();
  console.log(`  ${await upsertBatch('player_stats', stats, 'resolution=ignore-duplicates', '?on_conflict=player_id,grade_id')} sent`);

  // Teams
  console.log('Syncing teams...');
  const teams = db.prepare('SELECT id, name, organisation_id, season_id FROM teams').all();
  console.log(`  ${await upsertBatch('teams', teams, 'resolution=merge-duplicates')} upserted`);

  // Verify
  console.log('\n--- Verification ---');
  for (const t of ['players', 'player_stats', 'teams']) {
    const local = db.prepare(`SELECT count(*) as c FROM "${t}"`).get().c;
    const remote = await getCount(t);
    const match = local === remote ? '✓' : '✗';
    console.log(`${match} ${t}: local=${local} supabase=${remote}`);
  }
})();
