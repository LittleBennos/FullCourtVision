/**
 * FullCourtVision — EDJBA Fixture/Game Results Scraper
 * Pulls fixture and game result data for all EDJBA grades using
 * discoverFixtureByRound. Gives us win/loss data for team analysis.
 * 
 * Resumable: skips grades already scraped for fixtures.
 */
const https = require('https');
const db = require('./playhq-db');

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const options = {
      hostname: 'api.playhq.com', path: '/graphql', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'tenant': 'basketball-victoria',
        'origin': 'https://www.playhq.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`Parse: ${body.slice(0, 200)}`)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeFixturesForGrade(database, gradeId) {
  const r = await gql(`{ discoverGrade(gradeID: "${gradeId}") { rounds { id name number isFinalsRound provisionalDates } } }`);
  if (!r.data?.discoverGrade?.rounds) return 0;

  let gameCount = 0;
  for (const round of r.data.discoverGrade.rounds) {
    db.upsertRound(database, {
      id: round.id, grade_id: gradeId, name: round.name,
      number: round.number, provisional_date: round.provisionalDates?.[0], is_finals: round.isFinalsRound,
    });

    const fr = await gql(`query f($roundID: ID!) {
      discoverFixtureByRound(roundID: $roundID) {
        byes { id name }
        games {
          id
          home { ... on DiscoverTeam { id name } }
          away { ... on DiscoverTeam { id name } }
          result {
            home { score statistics { count type { value } } }
            away { score statistics { count type { value } } }
          }
          status { value }
          date
          allocation { time court { name venue { name } } }
        }
      }
    }`, { roundID: round.id });

    if (fr.data?.discoverFixtureByRound?.games) {
      for (const game of fr.data.discoverFixtureByRound.games) {
        const hs = game.result?.home?.score;
        const as_ = game.result?.away?.score;
        const hStats = {}; (game.result?.home?.statistics || []).forEach(s => { hStats[s.type?.value] = s.count; });
        const aStats = {}; (game.result?.away?.statistics || []).forEach(s => { aStats[s.type?.value] = s.count; });

        db.upsertGame(database, {
          id: game.id, grade_id: gradeId, round_id: round.id, round_name: round.name,
          home_team_id: game.home?.id, away_team_id: game.away?.id,
          home_score: hs ?? hStats.TOTAL_SCORE ?? null,
          away_score: as_ ?? aStats.TOTAL_SCORE ?? null,
          date: game.date, time: game.allocation?.time,
          venue: game.allocation?.court?.venue?.name, court: game.allocation?.court?.name,
          status: game.status?.value,
        });
        gameCount++;
      }
    }
    await sleep(500);
  }
  return gameCount;
}

async function main() {
  const database = db.getDb();

  try {
    // Get all EDJBA grades (seasons linked to EDJBA competition)
    const EDJBA_COMP = '66e291c2';
    const grades = database.prepare(`
      SELECT g.id, g.name, s.name as season_name 
      FROM grades g 
      JOIN seasons s ON g.season_id = s.id 
      WHERE s.competition_id = ?
      ORDER BY s.name, g.name
    `).all(EDJBA_COMP);

    console.log(`╔══════════════════════════════════════════════╗`);
    console.log(`║  EDJBA Fixture/Results Scraper               ║`);
    console.log(`║  ${grades.length} grades to check                       ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);

    let scraped = 0, skipped = 0, totalGames = 0;

    for (let i = 0; i < grades.length; i++) {
      const grade = grades[i];

      // Check if already scraped for fixtures
      const already = database.prepare(
        'SELECT 1 FROM scrape_log WHERE entity_type = ? AND entity_id = ? AND success = 1'
      ).get('grade_fixtures', grade.id);

      if (already) { skipped++; continue; }

      process.stdout.write(`[${i + 1}/${grades.length}] ${grade.season_name} / ${grade.name}... `);

      try {
        const games = await scrapeFixturesForGrade(database, grade.id);
        db.logScrape(database, 'grade_fixtures', grade.id, true);
        totalGames += games;
        scraped++;
        console.log(`${games} games ✓`);
      } catch (err) {
        db.logScrape(database, 'grade_fixtures', grade.id, false, err.message);
        console.log(`ERROR: ${err.message}`);
      }

      await sleep(1000);
    }

    // Summary
    const gamesWithScores = database.prepare(
      `SELECT COUNT(*) as c FROM games g 
       JOIN grades gr ON g.grade_id = gr.id 
       JOIN seasons s ON gr.season_id = s.id 
       WHERE s.competition_id = ? AND g.home_score IS NOT NULL`
    ).get(EDJBA_COMP).c;

    console.log('\n' + '═'.repeat(50));
    console.log('EDJBA FIXTURES COMPLETE');
    console.log('═'.repeat(50));
    console.log(`  Grades scraped: ${scraped} (${skipped} skipped)`);
    console.log(`  Games added: ${totalGames}`);
    console.log(`  Games with scores: ${gamesWithScores}`);

  } finally {
    database.close();
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
