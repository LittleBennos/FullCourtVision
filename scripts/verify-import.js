const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fcizsxlgckwjnuhlqhwc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjaXpzeGxnY2t3am51aGxxaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzMjkwMiwiZXhwIjoyMDg2MTA4OTAyfQ.4Rr9uyqa2pkcQEQ_Jvu2Me34kGYCziY0ZUiVGw4K7Vo');

const expected = { organisations: 887, competitions: 39, seasons: 138, grades: 3874, teams: 2231, players: 57735, player_stats: 380815, rounds: 26523, games: 89823, ladder: 0, scrape_log: 3902 };

async function main() {
  for (const [table, exp] of Object.entries(expected)) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    const ok = count === exp ? '✓' : '✗';
    console.log(`${ok} ${table}: ${count} (expected ${exp})`);
  }
}
main();
