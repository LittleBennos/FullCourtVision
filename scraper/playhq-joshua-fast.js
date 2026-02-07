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
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(body); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const JOSHUA_ID = 'f1fa18fc-a93f-45b9-ac91-f70652744dd7';

// Known grades from earlier search (Summer 2025/26)
const KNOWN_GRADES_2526 = [
  '227ac35f', // Boys U16 BA (regular: GP=4, PTS=7)
  '1c68e5ca', // Boys U16 A Grading (GP=1, PTS=0)
  'e6455294', // Boys U16 B Grading (GP=5, PTS=30)
];

// Season IDs from EDJBA
const EDJBA_SEASONS = [
  { id: '88026885', name: 'Summer 2025/26' },
  { id: 'f373fc05', name: 'Winter 2025' },
  { id: 'fa446579', name: 'Summer 2024/25' },
  { id: '39e5a1b9', name: 'Winter 2024' },
  { id: 'f0c50f4a', name: 'Summer 2023/24' },
];

async function findJoshuaTeamInSeason(seasonId, seasonName) {
  // Get all teams in this season and look for Eltham teams
  const r = await gql(`{ discoverTeams(filter: { seasonID: "${seasonId}" }) { id name } }`);
  if (!r.data?.discoverTeams) return null;
  
  const teams = r.data.discoverTeams;
  // Look for "Eltham U1X Boys 07" or similar
  const elthamBoys = teams.filter(t => {
    const n = t.name.toLowerCase();
    return n.includes('eltham') && n.includes('boy') && (n.includes('u14') || n.includes('u16') || n.includes('u12') || n.includes('u18'));
  });
  
  console.log(`  ${seasonName}: ${teams.length} total teams, ${elthamBoys.length} Eltham boys teams`);
  
  // We can't directly identify which team Joshua is on without checking stats.
  // But we know his team pattern: "Eltham U16 Boys 07" in current season.
  // Let's check each Eltham team's fixtures to find the one Joshua is on
  return elthamBoys;
}

async function scrapeAllPlayerStats(gradeId) {
  const allPlayers = [];
  let page = 1, totalPages = 1;
  
  while (page <= totalPages) {
    const r = await gql(`query publicGradeStatistics($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
      gradePlayerStatistics(gradeID: $gradeID, filter: $filter) {
        meta { page totalPages totalRecords }
        results { ranking profile { id firstName lastName } team { name } statistics { count details { value } } }
      }
    }`, { gradeID: gradeId, filter: { sort: [{ column: "APPEARANCE", direction: "DESC" }], pagination: { page, limit: 50 } } });
    
    if (!r.data?.gradePlayerStatistics) break;
    const stats = r.data.gradePlayerStatistics;
    totalPages = stats.meta.totalPages;
    allPlayers.push(...stats.results);
    page++;
    await sleep(100);
  }
  
  return allPlayers;
}

async function main() {
  const database = db.getDb();
  
  try {
    // Save org/comp data
    db.upsertOrganisation(database, { id: '0c8a84ea', name: 'Eastern Districts Junior Basketball Association (EDJBA)', type: 'ASSOCIATION' });
    db.upsertCompetition(database, { id: '66e291c2', organisation_id: '0c8a84ea', name: 'EDJBA' });
    
    // Step 1: Scrape known 2025/26 grades directly
    console.log('=== Step 1: Scraping known 2025/26 grades ===\n');
    const joshuaResults = [];
    
    for (const gradeId of KNOWN_GRADES_2526) {
      // Get grade info
      const gradeR = await gql(`{ discoverGrade(gradeID: "${gradeId}") { id name type season { id name } } }`);
      const gradeInfo = gradeR.data?.discoverGrade;
      if (!gradeInfo) continue;
      
      console.log(`Scraping: ${gradeInfo.name} (${gradeId})`);
      
      // Save grade
      db.upsertSeason(database, { id: gradeInfo.season.id, competition_id: '66e291c2', name: gradeInfo.season.name, status: 'ACTIVE' });
      db.upsertGrade(database, { id: gradeId, season_id: gradeInfo.season.id, name: gradeInfo.name, type: gradeInfo.type });
      
      // Get all player stats
      const players = await scrapeAllPlayerStats(gradeId);
      console.log(`  ${players.length} players`);
      
      for (const p of players) {
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
        
        if (p.profile.id === JOSHUA_ID) {
          joshuaResults.push({
            season: gradeInfo.season.name, grade: gradeInfo.name, team: p.team?.name,
            gp: s.APPEARANCE || 0, pts: s.TOTAL_SCORE || 0,
            '2pt': s['2_POINT_SCORE'] || 0, '3pt': s['3_POINT_SCORE'] || 0,
            fouls: s.TOTAL_FOULS || 0,
          });
        }
      }
      
      // Scrape fixtures
      const roundsR = await gql(`{ discoverGrade(gradeID: "${gradeId}") { rounds { id name number isFinalsRound provisionalDates } } }`);
      if (roundsR.data?.discoverGrade?.rounds) {
        let gameCount = 0;
        for (const round of roundsR.data.discoverGrade.rounds) {
          db.upsertRound(database, { id: round.id, grade_id: gradeId, name: round.name, number: round.number, provisional_date: round.provisionalDates?.[0], is_finals: round.isFinalsRound });
          
          const fr = await gql(`query discoverFixtureByRound($roundID: ID!) {
            discoverFixtureByRound(roundID: $roundID) {
              games { id home { ... on DiscoverTeam { id name } } away { ... on DiscoverTeam { id name } }
                result { home { score } away { score } } status { value } date
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
          await sleep(150);
        }
        console.log(`  ${gameCount} games`);
      }
    }
    
    // Step 2: Find Joshua in past seasons using team-based approach
    console.log('\n=== Step 2: Finding Joshua in past seasons ===\n');
    
    // For past seasons, get grades and search with the known profile ID
    const pastSeasons = EDJBA_SEASONS.slice(1); // skip 2025/26 already done
    
    for (const season of pastSeasons) {
      console.log(`\n--- ${season.name} ---`);
      
      const r = await gql(`{ discoverSeason(seasonID: "${season.id}") { id name grades { id name } } }`);
      if (!r.data?.discoverSeason?.grades) {
        console.log('  No grades');
        continue;
      }
      
      const grades = r.data.discoverSeason.grades;
      // Filter to Boys U12-U18 BA/BB/BC grades (the placement grades, not grading rounds)
      // This is much faster than searching all grades
      const likelyGrades = grades.filter(g => {
        const n = g.name.toLowerCase();
        const isBoysRelevant = (n.includes('u12') || n.includes('u14') || n.includes('u16') || n.includes('u18')) && 
                               (n.includes('boy') || !n.includes('girl'));
        const isRegularOrGrading = n.includes('ba') || n.includes('bb') || n.includes('bc') || 
                                    n.includes('bd') || n.includes('be') || n.includes('grading');
        return isBoysRelevant && isRegularOrGrading;
      });
      
      console.log(`  ${grades.length} total grades, ${likelyGrades.length} likely grades`);
      
      for (const grade of likelyGrades) {
        // Quick search: just scan first page for Joshua's profile ID
        const r = await gql(`query publicGradeStatistics($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
          gradePlayerStatistics(gradeID: $gradeID, filter: $filter) {
            meta { totalPages totalRecords }
            results { profile { id firstName lastName } team { name } statistics { count details { value } } }
          }
        }`, { gradeID: grade.id, filter: { sort: [{ column: "APPEARANCE", direction: "DESC" }], pagination: { page: 1, limit: 50 } } });
        
        if (!r.data?.gradePlayerStatistics) continue;
        
        const stats = r.data.gradePlayerStatistics;
        let match = stats.results.find(p => p.profile?.id === JOSHUA_ID);
        
        // Check remaining pages if needed (most grades have <50 players though)
        if (!match && stats.meta.totalPages > 1) {
          for (let pg = 2; pg <= stats.meta.totalPages; pg++) {
            const r2 = await gql(`query publicGradeStatistics($gradeID: ID!, $filter: GradePlayerStatisticsFilter) {
              gradePlayerStatistics(gradeID: $gradeID, filter: $filter) {
                results { profile { id } team { name } statistics { count details { value } } }
              }
            }`, { gradeID: grade.id, filter: { sort: [{ column: "APPEARANCE", direction: "DESC" }], pagination: { page: pg, limit: 50 } } });
            match = r2.data?.gradePlayerStatistics?.results?.find(p => p.profile?.id === JOSHUA_ID);
            if (match) break;
          }
        }
        
        if (match) {
          const s = {};
          (match.statistics || []).forEach(st => { s[st.details?.value] = st.count; });
          
          console.log(`  ✅ FOUND in ${grade.name}: ${match.team?.name} — GP=${s.APPEARANCE}, PTS=${s.TOTAL_SCORE}`);
          
          joshuaResults.push({
            season: season.name, grade: grade.name, gradeId: grade.id, team: match.team?.name,
            gp: s.APPEARANCE || 0, pts: s.TOTAL_SCORE || 0,
            '2pt': s['2_POINT_SCORE'] || 0, '3pt': s['3_POINT_SCORE'] || 0,
            fouls: s.TOTAL_FOULS || 0,
          });
          
          // Save to DB
          db.upsertSeason(database, { id: season.id, competition_id: '66e291c2', name: season.name, status: 'COMPLETED' });
          db.upsertGrade(database, { id: grade.id, season_id: season.id, name: grade.name });
          db.upsertPlayer(database, { id: JOSHUA_ID, first_name: 'Joshua', last_name: 'Dworkin' });
          db.upsertPlayerStats(database, {
            player_id: JOSHUA_ID, grade_id: grade.id, team_name: match.team?.name,
            games_played: s.APPEARANCE || 0, total_points: s.TOTAL_SCORE || 0,
            one_point: s['1_POINT_SCORE'] || 0, two_point: s['2_POINT_SCORE'] || 0,
            three_point: s['3_POINT_SCORE'] || 0, total_fouls: s.TOTAL_FOULS || 0,
          });
          
          // Also scrape this grade's full data
          console.log(`  Scraping full grade data...`);
          const allPlayers = await scrapeAllPlayerStats(grade.id);
          for (const p of allPlayers) {
            if (!p.profile || p.profile.id === JOSHUA_ID) continue;
            db.upsertPlayer(database, { id: p.profile.id, first_name: p.profile.firstName, last_name: p.profile.lastName });
            const st = {};
            (p.statistics || []).forEach(s => { st[s.details?.value] = s.count; });
            db.upsertPlayerStats(database, {
              player_id: p.profile.id, grade_id: grade.id, team_name: p.team?.name,
              games_played: st.APPEARANCE || 0, total_points: st.TOTAL_SCORE || 0,
              one_point: st['1_POINT_SCORE'] || 0, two_point: st['2_POINT_SCORE'] || 0,
              three_point: st['3_POINT_SCORE'] || 0, total_fouls: st.TOTAL_FOULS || 0,
              ranking: p.ranking,
            });
          }
          console.log(`  → ${allPlayers.length} players saved`);
          
          break; // Found in this season, move to next
        }
      }
    }
    
    // Print career summary
    console.log('\n\n' + '='.repeat(60));
    console.log('JOSHUA DWORKIN — COMPLETE CAREER SUMMARY');
    console.log('Profile ID: ' + JOSHUA_ID);
    console.log('='.repeat(60));
    
    // Sort by season (most recent first)
    joshuaResults.sort((a, b) => b.season.localeCompare(a.season));
    
    let totalGP = 0, totalPTS = 0, totalFouls = 0, total2PT = 0, total3PT = 0;
    
    for (const jg of joshuaResults) {
      const ppg = jg.gp > 0 ? (jg.pts / jg.gp).toFixed(1) : '0.0';
      const fpg = jg.gp > 0 ? (jg.fouls / jg.gp).toFixed(1) : '0.0';
      console.log(`\n  ${jg.season} | ${jg.grade}`);
      console.log(`  Team: ${jg.team}`);
      console.log(`  GP: ${jg.gp} | PTS: ${jg.pts} (${ppg} PPG) | 2PT: ${jg['2pt']} | 3PT: ${jg['3pt']} | F: ${jg.fouls} (${fpg} FPG)`);
      totalGP += jg.gp;
      totalPTS += jg.pts;
      totalFouls += jg.fouls;
      total2PT += jg['2pt'];
      total3PT += jg['3pt'];
    }
    
    if (totalGP > 0) {
      console.log(`\n  ${'─'.repeat(50)}`);
      console.log(`  CAREER: ${totalGP} GP | ${totalPTS} PTS (${(totalPTS/totalGP).toFixed(1)} PPG) | ${total2PT} 2PT | ${total3PT} 3PT | ${totalFouls} F (${(totalFouls/totalGP).toFixed(1)} FPG)`);
    }
    
    console.log('\n  DB:', JSON.stringify(db.getStats(database)));
    
  } finally {
    database.close();
  }
}

main().catch(console.error);
