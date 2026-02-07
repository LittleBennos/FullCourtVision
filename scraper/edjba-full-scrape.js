/**
 * FullCourtVision — EDJBA Full Data Expansion
 * Scrapes ALL grades, players, stats, and games across all EDJBA seasons.
 * Rate-limited and resumable via scrape_log table.
 */
const https = require('https');
const db = require('./playhq-db');

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const options = {
      hostname: 'api.playhq.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tenant': 'basketball-victoria',
        'origin': 'https://www.playhq.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error(`Parse error: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const EDJBA_ORG = '0c8a84ea';
const EDJBA_COMP = '66e291c2';

// All known EDJBA seasons
const SEASONS = [
  { id: '88026885', name: 'Summer 2025/26' },
  { id: 'f373fc05', name: 'Winter 2025' },
  { id: 'fa446579', name: 'Summer 2024/25' },
  { id: '39e5a1b9', name: 'Winter 2024' },
  { id: 'f0c50f4a', name: 'Summer 2023/24' },
];

let totalPlayersScraped = 0;
let totalGamesScraped = 0;
let totalGradesScraped = 0;
let skippedGrades = 0;

async function scrapePlayerStats(database, gradeId) {
  const allPlayers = [];
  let page = 1, totalPages = 1;

  while (page <= totalPages) {
    const r = await gql(`query stats($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
      gradePlayerStatistics(gradeID: $gradeID, filter: $filter) {
        meta { page totalPages totalRecords }
        results {
          ranking
          profile { id firstName lastName }
          team { name }
          statistics { count details { value } }
        }
      }
    }`, {
      gradeID: gradeId,
      filter: { sort: [{ column: "APPEARANCE", direction: "DESC" }], pagination: { page, limit: 50 } }
    });

    if (!r.data?.gradePlayerStatistics) break;
    const stats = r.data.gradePlayerStatistics;
    totalPages = stats.meta.totalPages;

    for (const p of stats.results) {
      if (!p.profile) continue;
      db.upsertPlayer(database, {
        id: p.profile.id,
        first_name: p.profile.firstName,
        last_name: p.profile.lastName,
      });
      const s = {};
      (p.statistics || []).forEach(st => { s[st.details?.value] = st.count; });
      db.upsertPlayerStats(database, {
        player_id: p.profile.id,
        grade_id: gradeId,
        team_name: p.team?.name,
        games_played: s.APPEARANCE || 0,
        total_points: s.TOTAL_SCORE || 0,
        one_point: s['1_POINT_SCORE'] || 0,
        two_point: s['2_POINT_SCORE'] || 0,
        three_point: s['3_POINT_SCORE'] || 0,
        total_fouls: s.TOTAL_FOULS || 0,
        ranking: p.ranking,
      });
      allPlayers.push(p);
    }

    page++;
    await sleep(120);
  }

  return allPlayers.length;
}

async function scrapeFixtures(database, gradeId) {
  const roundsR = await gql(`{ discoverGrade(gradeID: "${gradeId}") { rounds { id name number isFinalsRound provisionalDates } } }`);
  if (!roundsR.data?.discoverGrade?.rounds) return 0;

  let gameCount = 0;
  for (const round of roundsR.data.discoverGrade.rounds) {
    db.upsertRound(database, {
      id: round.id,
      grade_id: gradeId,
      name: round.name,
      number: round.number,
      provisional_date: round.provisionalDates?.[0],
      is_finals: round.isFinalsRound,
    });

    const fr = await gql(`query fix($roundID: ID!) {
      discoverFixtureByRound(roundID: $roundID) {
        byes { id name }
        games {
          id
          home { ... on DiscoverTeam { id name } }
          away { ... on DiscoverTeam { id name } }
          result { home { score } away { score } }
          status { value }
          date
          allocation { time court { name venue { name } } }
        }
      }
    }`, { roundID: round.id });

    if (fr.data?.discoverFixtureByRound?.games) {
      for (const game of fr.data.discoverFixtureByRound.games) {
        db.upsertGame(database, {
          id: game.id,
          grade_id: gradeId,
          round_id: round.id,
          round_name: round.name,
          home_team_id: game.home?.id,
          away_team_id: game.away?.id,
          home_score: game.result?.home?.score,
          away_score: game.result?.away?.score,
          date: game.date,
          time: game.allocation?.time,
          venue: game.allocation?.court?.venue?.name,
          court: game.allocation?.court?.name,
          status: game.status?.value,
        });
        gameCount++;
      }
    }
    await sleep(150);
  }

  return gameCount;
}

function isAlreadyScraped(database, gradeId) {
  const row = database.prepare('SELECT * FROM scrape_log WHERE entity_type = ? AND entity_id = ? AND success = 1')
    .get('grade_full', gradeId);
  return !!row;
}

function logScrapeResult(database, gradeId, success, error) {
  db.logScrape(database, 'grade_full', gradeId, success, error || null);
}

async function main() {
  const database = db.getDb();

  try {
    db.upsertOrganisation(database, { id: EDJBA_ORG, name: 'Eastern Districts Junior Basketball Association (EDJBA)', type: 'ASSOCIATION' });
    db.upsertCompetition(database, { id: EDJBA_COMP, organisation_id: EDJBA_ORG, name: 'EDJBA' });

    console.log('╔══════════════════════════════════════════╗');
    console.log('║  FullCourtVision — EDJBA Full Expansion  ║');
    console.log('╚══════════════════════════════════════════╝\n');

    for (const season of SEASONS) {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`SEASON: ${season.name} (${season.id})`);
      console.log('═'.repeat(50));

      db.upsertSeason(database, { id: season.id, competition_id: EDJBA_COMP, name: season.name });

      // Get all grades for this season
      const r = await gql(`{ discoverSeason(seasonID: "${season.id}") { id name grades { id name type } } }`);
      if (!r.data?.discoverSeason?.grades) {
        console.log('  No grades found.');
        continue;
      }

      const grades = r.data.discoverSeason.grades;
      console.log(`  Total grades: ${grades.length}`);

      // Save all grade records
      for (const grade of grades) {
        db.upsertGrade(database, { id: grade.id, season_id: season.id, name: grade.name, type: grade.type });
      }

      // Scrape each grade (skip already completed)
      let seasonPlayers = 0, seasonGames = 0, seasonGradesCompleted = 0;

      for (let i = 0; i < grades.length; i++) {
        const grade = grades[i];

        if (isAlreadyScraped(database, grade.id)) {
          skippedGrades++;
          continue;
        }

        const progress = `[${i + 1}/${grades.length}]`;
        process.stdout.write(`  ${progress} ${grade.name}... `);

        let retries = 0;
        while (retries < 3) {
          try {
            const playerCount = await scrapePlayerStats(database, grade.id);
            const gameCount = await scrapeFixtures(database, grade.id);

            logScrapeResult(database, grade.id, true);

            seasonPlayers += playerCount;
            seasonGames += gameCount;
            seasonGradesCompleted++;
            totalPlayersScraped += playerCount;
            totalGamesScraped += gameCount;
            totalGradesScraped++;

            console.log(`${playerCount} players, ${gameCount} games ✓`);
            break;
          } catch (err) {
            retries++;
            if (retries >= 3) {
              logScrapeResult(database, grade.id, false, err.message);
              console.log(`ERROR (after 3 retries): ${err.message}`);
            } else {
              console.log(`RETRY ${retries}/3: ${err.message}`);
              await sleep(2000 * retries);
            }
          }
        }

        // Rate limit: small pause between grades
        await sleep(200);

        // Progress report every 25 grades
        if (totalGradesScraped > 0 && totalGradesScraped % 25 === 0) {
          const stats = db.getStats(database);
          console.log(`\n  ── Progress: ${totalGradesScraped} grades | ${stats.players} players | ${stats.games} games | ${stats.playerStats} stat records ──\n`);
        }
      }

      console.log(`\n  Season summary: ${seasonGradesCompleted} grades scraped, ${seasonPlayers} players, ${seasonGames} games`);
    }

    // Final summary
    const stats = db.getStats(database);
    console.log('\n\n' + '═'.repeat(50));
    console.log('SCRAPE COMPLETE');
    console.log('═'.repeat(50));
    console.log(`  Grades scraped: ${totalGradesScraped} (${skippedGrades} skipped/already done)`);
    console.log(`  Players: ${stats.players}`);
    console.log(`  Player stat records: ${stats.playerStats}`);
    console.log(`  Games: ${stats.games}`);
    console.log(`  Organisations: ${stats.organisations}`);

  } finally {
    database.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
