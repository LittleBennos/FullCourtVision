/**
 * FullCourtVision — Victoria-Wide Scraper
 * Iterates through ALL 887+ organisations, discovers competitions/seasons/grades,
 * and scrapes player stats + fixtures for each grade.
 * 
 * RESUMABLE: Uses scrape_log to skip already-scraped grades and orgs.
 * RATE LIMITED: 1-2 second delays between API calls.
 * 
 * Usage: node victoria-wide-scrape.js [--org <orgId>] [--skip-fixtures] [--skip-stats]
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
        catch (e) { reject(new Error(`Parse error: ${body.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Progress tracking ---
function isOrgScraped(database, orgId) {
  return !!database.prepare('SELECT 1 FROM scrape_log WHERE entity_type = ? AND entity_id = ? AND success = 1').get('org_wide', orgId);
}

function isGradeScraped(database, gradeId) {
  return !!database.prepare('SELECT 1 FROM scrape_log WHERE entity_type IN (?, ?) AND entity_id = ? AND success = 1').get('grade_wide', 'grade_full', gradeId);
}

// --- API functions with retry ---
async function gqlRetry(query, variables = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await gql(query, variables);
      if (r.errors) {
        const msg = r.errors.map(e => e.message).join('; ');
        if (i < retries - 1) { await sleep(2000 * (i + 1)); continue; }
        throw new Error(`GraphQL errors: ${msg}`);
      }
      return r;
    } catch (err) {
      if (i < retries - 1) { await sleep(2000 * (i + 1)); continue; }
      throw err;
    }
  }
}

// --- Scraping functions ---
async function discoverCompetitionsAndSeasons(database, orgId) {
  const r = await gqlRetry(`{ 
    discoverCompetitions(organisationID: "${orgId}") { 
      id name 
      seasons(organisationID: "${orgId}") { 
        id name startDate endDate status { value } 
      } 
    } 
  }`);

  if (!r.data?.discoverCompetitions) return [];

  const results = [];
  for (const comp of r.data.discoverCompetitions) {
    db.upsertCompetition(database, { id: comp.id, organisation_id: orgId, name: comp.name });
    for (const season of (comp.seasons || [])) {
      db.upsertSeason(database, {
        id: season.id, competition_id: comp.id, name: season.name,
        start_date: season.startDate, end_date: season.endDate, status: season.status?.value,
      });
      results.push({ compId: comp.id, compName: comp.name, seasonId: season.id, seasonName: season.name });
    }
  }
  return results;
}

async function discoverGrades(database, seasonId) {
  const r = await gqlRetry(`{ discoverSeason(seasonID: "${seasonId}") { grades { id name type } } }`);
  if (!r.data?.discoverSeason?.grades) return [];
  const grades = r.data.discoverSeason.grades;
  for (const g of grades) db.upsertGrade(database, { id: g.id, season_id: seasonId, name: g.name, type: g.type });
  return grades;
}

async function scrapePlayerStats(database, gradeId) {
  let page = 1, totalPages = 1, total = 0;
  while (page <= totalPages) {
    const r = await gqlRetry(`query s($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
      gradePlayerStatistics(gradeID: $gradeID, filter: $filter) {
        meta { page totalPages }
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
      db.upsertPlayer(database, { id: p.profile.id, first_name: p.profile.firstName, last_name: p.profile.lastName });
      const s = {};
      (p.statistics || []).forEach(st => { s[st.details?.value] = st.count; });
      db.upsertPlayerStats(database, {
        player_id: p.profile.id, grade_id: gradeId, team_name: p.team?.name,
        games_played: s.APPEARANCE || 0, total_points: s.TOTAL_SCORE || 0,
        one_point: s['1_POINT_SCORE'] || 0, two_point: s['2_POINT_SCORE'] || 0,
        three_point: s['3_POINT_SCORE'] || 0, total_fouls: s.TOTAL_FOULS || 0,
        ranking: p.ranking,
      });
      total++;
    }
    page++;
    await sleep(500);
  }
  return total;
}

async function scrapeFixtures(database, gradeId) {
  const r = await gqlRetry(`{ discoverGrade(gradeID: "${gradeId}") { rounds { id name number isFinalsRound provisionalDates } } }`);
  if (!r.data?.discoverGrade?.rounds) return 0;

  let gameCount = 0;
  for (const round of r.data.discoverGrade.rounds) {
    db.upsertRound(database, {
      id: round.id, grade_id: gradeId, name: round.name,
      number: round.number, provisional_date: round.provisionalDates?.[0], is_finals: round.isFinalsRound,
    });

    const fr = await gqlRetry(`query f($roundID: ID!) {
      discoverFixtureByRound(roundID: $roundID) {
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
          id: game.id, grade_id: gradeId, round_id: round.id, round_name: round.name,
          home_team_id: game.home?.id, away_team_id: game.away?.id,
          home_score: game.result?.home?.score, away_score: game.result?.away?.score,
          date: game.date, time: game.allocation?.time,
          venue: game.allocation?.court?.venue?.name, court: game.allocation?.court?.name,
          status: game.status?.value,
        });
        gameCount++;
      }
    }
    await sleep(1000);
  }
  return gameCount;
}

// --- Main orchestrator ---
async function main() {
  const args = process.argv.slice(2);
  const singleOrg = args.includes('--org') ? args[args.indexOf('--org') + 1] : null;
  const skipFixtures = args.includes('--skip-fixtures');
  const skipStats = args.includes('--skip-stats');

  const database = db.getDb();

  try {
    const orgs = singleOrg
      ? database.prepare('SELECT id, name FROM organisations WHERE id = ?').all(singleOrg)
      : database.prepare('SELECT id, name FROM organisations ORDER BY name').all();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  FullCourtVision — Victoria-Wide Scraper       ║');
    console.log(`║  ${orgs.length} organisations to process              ║`);
    console.log('╚════════════════════════════════════════════════╝\n');

    let orgsDone = 0, orgsSkipped = 0, totalGrades = 0, totalPlayers = 0, totalGames = 0;
    const startTime = Date.now();

    for (let oi = 0; oi < orgs.length; oi++) {
      const org = orgs[oi];

      if (isOrgScraped(database, org.id)) {
        orgsSkipped++;
        continue;
      }

      console.log(`\n[${ oi + 1}/${orgs.length}] ${org.name} (${org.id})`);

      try {
        // Discover competitions & seasons
        const seasons = await discoverCompetitionsAndSeasons(database, org.id);
        if (seasons.length === 0) {
          console.log('  No competitions/seasons found');
          db.logScrape(database, 'org_wide', org.id, true);
          orgsDone++;
          await sleep(1000);
          continue;
        }
        console.log(`  ${seasons.length} competition-seasons`);

        let orgGrades = 0, orgPlayers = 0, orgGames = 0;

        for (const s of seasons) {
          const grades = await discoverGrades(database, s.seasonId);
          if (grades.length === 0) continue;
          console.log(`  ${s.compName} / ${s.seasonName}: ${grades.length} grades`);
          await sleep(1000);

          for (let gi = 0; gi < grades.length; gi++) {
            const grade = grades[gi];

            if (isGradeScraped(database, grade.id)) continue;

            process.stdout.write(`    [${gi + 1}/${grades.length}] ${grade.name}... `);

            let players = 0, games = 0;
            try {
              if (!skipStats) players = await scrapePlayerStats(database, grade.id);
              await sleep(1000);
              if (!skipFixtures) games = await scrapeFixtures(database, grade.id);

              db.logScrape(database, 'grade_wide', grade.id, true);
              orgGrades++;
              orgPlayers += players;
              orgGames += games;
              console.log(`${players} players, ${games} games ✓`);
            } catch (err) {
              db.logScrape(database, 'grade_wide', grade.id, false, err.message);
              console.log(`ERROR: ${err.message}`);
            }

            await sleep(1500);
          }
        }

        db.logScrape(database, 'org_wide', org.id, true);
        orgsDone++;
        totalGrades += orgGrades;
        totalPlayers += orgPlayers;
        totalGames += orgGames;

        console.log(`  ✓ Done: ${orgGrades} grades, ${orgPlayers} players, ${orgGames} games`);

        // Progress report every 10 orgs
        if (orgsDone % 10 === 0) {
          const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
          const stats = db.getStats(database);
          console.log(`\n  ══ Progress: ${orgsDone}/${orgs.length} orgs (${orgsSkipped} skipped) | ${elapsed}min | DB: ${stats.players} players, ${stats.games} games, ${stats.playerStats} stat records ══\n`);
        }

      } catch (err) {
        console.log(`  ERROR on org: ${err.message}`);
        db.logScrape(database, 'org_wide', org.id, false, err.message);
      }

      await sleep(1500);
    }

    // Final summary
    const stats = db.getStats(database);
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log('\n' + '═'.repeat(50));
    console.log('VICTORIA-WIDE SCRAPE COMPLETE');
    console.log('═'.repeat(50));
    console.log(`  Time: ${elapsed} minutes`);
    console.log(`  Orgs processed: ${orgsDone} (${orgsSkipped} skipped)`);
    console.log(`  Grades scraped: ${totalGrades}`);
    console.log(`  DB totals: ${JSON.stringify(stats, null, 2)}`);

  } finally {
    database.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
