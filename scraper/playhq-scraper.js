const https = require('https');
const db = require('./playhq-db');
const { syncToSupabase } = require('../scripts/sync-to-supabase');

const TENANT = 'basketball-victoria';

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const options = {
      hostname: 'api.playhq.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tenant': TENANT,
        'origin': 'https://www.playhq.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(body); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Scraper functions ---

async function scrapeOrganisations(database) {
  console.log('Scraping organisations...');
  let page = 1;
  let total = 0;
  
  while (true) {
    const r = await gql(`{ discoverOrganisations(filter: { limit: 100, page: ${page} }) { 
      results { id name type } meta { totalPages totalRecords }
    } }`);
    
    if (r.errors || !r.data?.discoverOrganisations?.results?.length) break;
    
    const { results, meta } = r.data.discoverOrganisations;
    
    for (const org of results) {
      db.upsertOrganisation(database, { id: org.id, name: org.name, type: org.type });
    }
    
    total += results.length;
    if (page === 1) console.log(`  Total: ${meta.totalRecords} organisations`);
    
    if (page >= meta.totalPages) break;
    page++;
    await sleep(200);
  }
  
  console.log(`  Saved ${total} organisations`);
}

async function scrapeCompetitionsAndSeasons(database, orgId) {
  const r = await gql(`{ 
    discoverCompetitions(organisationID: "${orgId}") { 
      id name 
      seasons(organisationID: "${orgId}") { 
        id name startDate endDate status { value } 
      } 
    } 
  }`);
  
  if (r.errors || !r.data?.discoverCompetitions) return [];
  
  const results = [];
  for (const comp of r.data.discoverCompetitions) {
    db.upsertCompetition(database, { id: comp.id, organisation_id: orgId, name: comp.name });
    
    for (const season of (comp.seasons || [])) {
      db.upsertSeason(database, {
        id: season.id,
        competition_id: comp.id,
        name: season.name,
        start_date: season.startDate,
        end_date: season.endDate,
        status: season.status?.value,
      });
      results.push({ comp, season });
    }
  }
  
  return results;
}

async function scrapeGrades(database, seasonId) {
  const r = await gql(`{ discoverSeason(seasonID: "${seasonId}") { 
    id name grades { id name type } 
  } }`);
  
  if (!r.data?.discoverSeason?.grades) return [];
  
  const grades = r.data.discoverSeason.grades;
  for (const grade of grades) {
    db.upsertGrade(database, { id: grade.id, season_id: seasonId, name: grade.name, type: grade.type });
  }
  
  return grades;
}

async function scrapeTeams(database, seasonId) {
  const r = await gql(`{ discoverTeams(filter: { seasonID: "${seasonId}" }) { 
    id name organisation { id name }
  } }`);
  
  if (!r.data?.discoverTeams) return [];
  
  const teams = r.data.discoverTeams;
  for (const team of teams) {
    db.upsertTeam(database, {
      id: team.id,
      name: team.name,
      organisation_id: team.organisation?.id,
      season_id: seasonId,
    });
  }
  
  return teams;
}

async function scrapeGradeStats(database, gradeId) {
  let page = 1;
  let totalPages = 1;
  let total = 0;
  
  while (page <= totalPages) {
    const r = await gql(`query publicGradeStatistics($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
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
    
    if (r.errors || !r.data?.gradePlayerStatistics) break;
    
    const stats = r.data.gradePlayerStatistics;
    totalPages = stats.meta.totalPages;
    
    for (const result of stats.results) {
      if (!result.profile) continue;
      
      db.upsertPlayer(database, {
        id: result.profile.id,
        first_name: result.profile.firstName,
        last_name: result.profile.lastName,
      });
      
      const s = {};
      (result.statistics || []).forEach(st => { s[st.details?.value] = st.count; });
      
      db.upsertPlayerStats(database, {
        player_id: result.profile.id,
        grade_id: gradeId,
        team_name: result.team?.name,
        games_played: s.APPEARANCE || 0,
        total_points: s.TOTAL_SCORE || 0,
        one_point: s['1_POINT_SCORE'] || 0,
        two_point: s['2_POINT_SCORE'] || 0,
        three_point: s['3_POINT_SCORE'] || 0,
        total_fouls: s.TOTAL_FOULS || 0,
        ranking: result.ranking,
      });
      
      total++;
    }
    
    page++;
    await sleep(100);
  }
  
  return total;
}

async function scrapeRoundsAndFixtures(database, gradeId) {
  // Get rounds
  const r = await gql(`query gradeRounds($gradeID: ID!) {
    discoverGrade(gradeID: $gradeID) {
      id rounds {
        id name number isFinalsRound provisionalDates
      }
    }
  }`, { gradeID: gradeId });
  
  if (!r.data?.discoverGrade?.rounds) return 0;
  
  const rounds = r.data.discoverGrade.rounds;
  let gameCount = 0;
  
  for (const round of rounds) {
    db.upsertRound(database, {
      id: round.id,
      grade_id: gradeId,
      name: round.name,
      number: round.number,
      provisional_date: round.provisionalDates?.[0],
      is_finals: round.isFinalsRound,
    });
    
    // Get fixtures for this round
    const fr = await gql(`query discoverFixtureByRound($roundID: ID!) {
      discoverFixtureByRound(roundID: $roundID) {
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
          allocation {
            time
            court { name venue { name } }
          }
        }
      }
    }`, { roundID: round.id });
    
    if (!fr.data?.discoverFixtureByRound?.games) continue;
    
    for (const game of fr.data.discoverFixtureByRound.games) {
      const homeScore = game.result?.home?.score;
      const awayScore = game.result?.away?.score;
      
      // Get total score from statistics if not in score field
      const homeStats = {};
      (game.result?.home?.statistics || []).forEach(s => { homeStats[s.type?.value] = s.count; });
      const awayStats = {};
      (game.result?.away?.statistics || []).forEach(s => { awayStats[s.type?.value] = s.count; });
      
      db.upsertGame(database, {
        id: game.id,
        grade_id: gradeId,
        round_id: round.id,
        round_name: round.name,
        home_team_id: game.home?.id,
        away_team_id: game.away?.id,
        home_score: homeScore ?? homeStats.TOTAL_SCORE ?? null,
        away_score: awayScore ?? awayStats.TOTAL_SCORE ?? null,
        date: game.date,
        time: game.allocation?.time,
        venue: game.allocation?.court?.venue?.name,
        court: game.allocation?.court?.name,
        status: game.status?.value,
      });
      
      gameCount++;
    }
    
    await sleep(200);
  }
  
  return gameCount;
}

// --- Main scraping orchestrator ---

async function scrapeAssociation(orgId, options = {}) {
  const database = db.getDb();
  const { includeStats = true, includeFixtures = true, seasonFilter = null } = options;
  
  try {
    console.log(`\nScraping association: ${orgId}`);
    
    // Get competitions and seasons
    const compSeasons = await scrapeCompetitionsAndSeasons(database, orgId);
    console.log(`  ${compSeasons.length} competition-seasons`);
    
    for (const { comp, season } of compSeasons) {
      // Apply season filter if specified
      if (seasonFilter && !seasonFilter(season)) continue;
      
      console.log(`\n  ${comp.name} / ${season.name} (${season.status?.value || season.status})`);
      
      // Get grades
      const grades = await scrapeGrades(database, season.id);
      console.log(`    ${grades.length} grades`);
      
      // Get teams
      const teams = await scrapeTeams(database, season.id);
      console.log(`    ${teams.length} teams`);
      
      // Scrape each grade
      for (let i = 0; i < grades.length; i++) {
        const grade = grades[i];
        process.stdout.write(`    [${i + 1}/${grades.length}] ${grade.name}...`);
        
        let statCount = 0;
        let gameCount = 0;
        
        if (includeStats) {
          statCount = await scrapeGradeStats(database, grade.id);
        }
        
        if (includeFixtures) {
          gameCount = await scrapeRoundsAndFixtures(database, grade.id);
        }
        
        console.log(` ${statCount} players, ${gameCount} games`);
        db.logScrape(database, 'grade', grade.id);
        await sleep(100);
      }
    }
    
    const stats = db.getStats(database);
    console.log('\n  DB totals:', JSON.stringify(stats));
    
  } finally {
    database.close();
  }

  // Sync to Supabase after scrape
  try {
    await syncToSupabase();
  } catch (e) {
    console.error('Supabase sync failed (SQLite data is safe):', e.message);
  }
}

// Export for use by other scripts
module.exports = { gql, scrapeOrganisations, scrapeAssociation, sleep };

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'orgs') {
    const database = db.getDb();
    scrapeOrganisations(database).then(() => database.close());
  } else if (command === 'assoc') {
    const orgId = args[1];
    if (!orgId) { console.log('Usage: node playhq-scraper.js assoc <orgId>'); process.exit(1); }
    scrapeAssociation(orgId).catch(console.error);
  } else if (command === 'stats') {
    const database = db.getDb();
    console.log(db.getStats(database));
    database.close();
  } else {
    console.log('Usage:');
    console.log('  node playhq-scraper.js orgs          - Scrape all organisations');
    console.log('  node playhq-scraper.js assoc <orgId>  - Scrape an association');
    console.log('  node playhq-scraper.js stats          - Show DB stats');
  }
}
