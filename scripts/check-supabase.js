const SUPABASE_URL = 'https://fcizsxlgckwjnuhlqhwc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjaXpzeGxnY2t3am51aGxxaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI5MDIsImV4cCI6MjA4NjEwODkwMn0.N7J-N2p3c6OYRtnN9wNazkDEWIULAHOkGniJZ1mer_E';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  Prefer: 'count=exact'
};

async function getCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, { headers });
  const range = res.headers.get('content-range');
  return range ? range.split('/')[1] : `HTTP ${res.status}`;
}

(async () => {
  for (const t of ['players', 'player_stats', 'teams', 'grades', 'seasons', 'competitions', 'organisations', 'games', 'rounds']) {
    console.log(`${t}: ${await getCount(t)}`);
  }
})();
