import { supabase } from "./supabase";

export interface RisingStar {
  player_id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  organisation_name: string;
  previous_season_ppg: number;
  current_season_ppg: number;
  improvement: number;
  previous_season_games: number;
  current_season_games: number;
  previous_season_name: string;
  current_season_name: string;
}

export async function getRisingStars(): Promise<RisingStar[]> {
  const { data, error } = await supabase.rpc("get_rising_stars");
  if (error || !data) return [];
  return data as RisingStar[];
}

// Helper to fetch all rows from a table, bypassing Supabase's 1000-row default limit
async function fetchAllRows(table: string, select: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

export type Stats = {
  players: number;
  games: number;
  organisations: number;
  teams: number;
  competitions: number;
  seasons: number;
  grades: number;
};

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  total_games: number;
  total_points: number;
  ppg: number;
};

export type TopPlayer = Player;

export type Team = {
  id: string;
  name: string;
  organisation_id: string;
  season_id: string;
  org_name: string;
  season_name: string;
  wins: number;
  losses: number;
  games_played: number;
};

export type Organisation = {
  id: string;
  name: string;
  type: string | null;
  suburb: string | null;
  state: string | null;
  website: string | null;
};

export type Competition = {
  id: string;
  name: string;
  type: string | null;
  organisation_id: string;
  org_name: string;
};

export type Season = {
  id: string;
  competition_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  competition_name: string;
};

export async function getStats(): Promise<Stats> {
  const [players, games, organisations, teams, competitions, seasons, grades] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("games").select("*", { count: "exact", head: true }),
    supabase.from("organisations").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("competitions").select("*", { count: "exact", head: true }),
    supabase.from("seasons").select("*", { count: "exact", head: true }),
    supabase.from("grades").select("*", { count: "exact", head: true }),
  ]);

  return {
    players: players.count ?? 0,
    games: games.count ?? 0,
    organisations: organisations.count ?? 0,
    teams: teams.count ?? 0,
    competitions: competitions.count ?? 0,
    seasons: seasons.count ?? 0,
    grades: grades.count ?? 0,
  };
}

export async function getAllPlayers(): Promise<Player[]> {
  // Use the player_aggregates view for server-side aggregation
  const data = await fetchAllRows("player_aggregates", "player_id, first_name, last_name, total_games, total_points, ppg");

  return data.map((p) => ({
    id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    total_games: p.total_games,
    total_points: p.total_points,
    ppg: +p.ppg,
  }));
}

export async function getTopPlayers(): Promise<TopPlayer[]> {
  const { data } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, ppg")
    .order("total_points", { ascending: false })
    .limit(500);

  if (!data) return [];

  return data.map((p) => ({
    id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    total_games: p.total_games,
    total_points: p.total_points,
    ppg: +p.ppg,
  }));
}

export interface SimilarPlayer {
  id: string;
  first_name: string;
  last_name: string;
  similarity: number; // 0-100
  ppg: number;
  foulsPg: number;
  twoPtPg: number;
  threePtPg: number;
}

export async function getSimilarPlayers(playerId: string, limit = 5): Promise<SimilarPlayer[]> {
  // Fetch all player stats rows
  const allStats = await fetchAllRows(
    "player_stats",
    "player_id, games_played, total_points, two_point, three_point, total_fouls"
  );

  // Also need player names
  const allPlayers = await fetchAllRows("players", "id, first_name, last_name");
  const playerMap = new Map(allPlayers.map((p: any) => [p.id, p]));

  // Aggregate per player
  const agg = new Map<string, { games: number; points: number; twoPt: number; threePt: number; fouls: number }>();
  for (const s of allStats) {
    const pid = s.player_id;
    const cur = agg.get(pid) || { games: 0, points: 0, twoPt: 0, threePt: 0, fouls: 0 };
    cur.games += s.games_played || 0;
    cur.points += s.total_points || 0;
    cur.twoPt += s.two_point || 0;
    cur.threePt += s.three_point || 0;
    cur.fouls += s.total_fouls || 0;
    agg.set(pid, cur);
  }

  // Build per-game vectors for players with >= 3 games
  const vectors = new Map<string, [number, number, number, number]>();
  for (const [pid, a] of agg) {
    if (a.games < 3) continue;
    vectors.set(pid, [
      a.points / a.games,
      a.fouls / a.games,
      a.twoPt / a.games,
      a.threePt / a.games,
    ]);
  }

  const target = vectors.get(playerId);
  if (!target) return [];

  // Compute cosine similarity
  const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
  const mag = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const targetMag = mag(target);
  if (targetMag === 0) return [];

  const results: SimilarPlayer[] = [];
  for (const [pid, vec] of vectors) {
    if (pid === playerId) continue;
    const m = mag(vec);
    if (m === 0) continue;
    const sim = dot(target, vec) / (targetMag * m);
    const p = playerMap.get(pid);
    if (!p) continue;
    results.push({
      id: pid,
      first_name: p.first_name,
      last_name: p.last_name,
      similarity: Math.round(sim * 1000) / 10,
      ppg: +(vec[0].toFixed(1)),
      foulsPg: +(vec[1].toFixed(1)),
      twoPtPg: +(vec[2].toFixed(1)),
      threePtPg: +(vec[3].toFixed(1)),
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

export async function getPlayerDetails(id: string) {
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, updated_at")
    .eq("id", id)
    .single();

  if (!player) return null;

  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      id, player_id, grade_id, team_name, games_played, total_points,
      one_point, two_point, three_point, total_fouls, ranking,
      grades!inner(name, type, seasons!inner(name, competitions!inner(name)))
    `)
    .eq("player_id", id);

  const mappedStats = (stats || []).map((s: any) => ({
    id: s.id,
    player_id: s.player_id,
    grade_id: s.grade_id,
    team_name: s.team_name,
    games_played: s.games_played,
    total_points: s.total_points,
    one_point: s.one_point,
    two_point: s.two_point,
    three_point: s.three_point,
    total_fouls: s.total_fouls,
    ranking: s.ranking,
    grade_name: s.grades?.name,
    grade_type: s.grades?.type,
    season_name: s.grades?.seasons?.name,
    competition_name: s.grades?.seasons?.competitions?.name,
    start_date: null,
  }));

  return { player, stats: mappedStats };
}

export async function getTeams(): Promise<Team[]> {
  const data = await fetchAllRows("team_aggregates", "team_id, name, organisation_id, season_id, organisation_name, season_name, wins, losses, gp");

  return data.map((t: any) => ({
    id: t.team_id,
    name: t.name,
    organisation_id: t.organisation_id,
    season_id: t.season_id,
    org_name: t.organisation_name || "",
    season_name: t.season_name || "",
    wins: t.wins,
    losses: t.losses,
    games_played: t.gp,
  }));
}

export async function getTeamById(id: string): Promise<Team | null> {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("id", id)
    .single();

  if (!team) return null;

  // Get win/loss for this team
  const { data: homeGames } = await supabase
    .from("games")
    .select("home_score, away_score")
    .eq("home_team_id", id)
    .not("home_score", "is", null);

  const { data: awayGames } = await supabase
    .from("games")
    .select("home_score, away_score")
    .eq("away_team_id", id)
    .not("home_score", "is", null);

  let wins = 0, losses = 0, gp = 0;
  for (const g of homeGames || []) {
    gp++;
    if (g.home_score > g.away_score) wins++;
    else losses++;
  }
  for (const g of awayGames || []) {
    gp++;
    if (g.away_score > g.home_score) wins++;
    else losses++;
  }

  return {
    id: team.id,
    name: team.name,
    organisation_id: team.organisation_id,
    season_id: team.season_id,
    org_name: (team.organisations as any)?.name || "",
    season_name: (team.seasons as any)?.name || "",
    wins,
    losses,
    games_played: gp,
  };
}

export type TeamPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  games_played: number;
  total_points: number;
  ppg: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
};

export async function getTeamPlayers(teamId: string): Promise<TeamPlayer[]> {
  // Get the team to find its season
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("id", teamId)
    .single();

  if (!team) return [];

  // Get grades for this team's season
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .eq("season_id", team.season_id);

  if (!grades || grades.length === 0) return [];

  const gradeIds = grades.map(g => g.id);

  // Get player_stats matching this team name and grades
  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      player_id, games_played, total_points, one_point, two_point, three_point, total_fouls,
      players!inner(first_name, last_name)
    `)
    .eq("team_name", team.name)
    .in("grade_id", gradeIds);

  if (!stats) return [];

  // Aggregate by player (in case of multiple grade entries)
  const playerMap = new Map<string, TeamPlayer>();
  for (const s of stats) {
    const pid = s.player_id;
    const existing = playerMap.get(pid);
    if (existing) {
      existing.games_played += s.games_played || 0;
      existing.total_points += s.total_points || 0;
      existing.one_point += s.one_point || 0;
      existing.two_point += s.two_point || 0;
      existing.three_point += s.three_point || 0;
      existing.total_fouls += s.total_fouls || 0;
    } else {
      playerMap.set(pid, {
        id: pid,
        first_name: (s.players as any)?.first_name || '',
        last_name: (s.players as any)?.last_name || '',
        games_played: s.games_played || 0,
        total_points: s.total_points || 0,
        one_point: s.one_point || 0,
        two_point: s.two_point || 0,
        three_point: s.three_point || 0,
        total_fouls: s.total_fouls || 0,
        ppg: 0,
      });
    }
  }

  return Array.from(playerMap.values())
    .map(p => ({ ...p, ppg: p.games_played > 0 ? +(p.total_points / p.games_played).toFixed(1) : 0 }))
    .sort((a, b) => b.total_points - a.total_points);
}

export async function getOrganisations(): Promise<Organisation[]> {
  const { data } = await supabase
    .from("organisations")
    .select("id, name, type, suburb, state, website")
    .order("name");

  return (data || []) as Organisation[];
}

export async function getCompetitions(): Promise<Competition[]> {
  const { data } = await supabase
    .from("competitions")
    .select("id, name, type, organisation_id, organisations(name)")
    .order("name");

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    organisation_id: c.organisation_id,
    org_name: c.organisations?.name || "",
  }));
}

export async function getSeasons(): Promise<Season[]> {
  const { data } = await supabase
    .from("seasons")
    .select("id, competition_id, name, start_date, end_date, status, competitions(name)")
    .order("name");

  return (data || []).map((s: any) => ({
    id: s.id,
    competition_id: s.competition_id,
    name: s.name,
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
    competition_name: s.competitions?.name || "",
  }));
}

export async function getAvailableSeasons(): Promise<Season[]> {
  const { data } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, status, competitions(name)")
    .order("start_date", { ascending: false });

  return (data || []).map((s: any) => ({
    id: s.id,
    competition_id: "",
    name: s.name,
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
    competition_name: s.competitions?.name || "",
  }));
}

export async function getLeaderboards(seasonId?: string): Promise<{ ppg: any[]; games: any[]; threes: any[] }> {
  let processedData: any[];
  
  if (seasonId) {
    // When filtering by season, we need to aggregate manually since player_aggregates shows all seasons
    const { data: seasonData } = await supabase
      .from("player_stats")
      .select(`
        player_id,
        players!inner(first_name, last_name),
        games_played,
        total_points,
        three_point,
        grades!inner(season_id, seasons!inner(id, name))
      `)
      .eq("grades.season_id", seasonId);

    // Aggregate data by player when filtering by season
    const playerMap = new Map<string, {
      player_id: string;
      first_name: string;
      last_name: string;
      total_games: number;
      total_points: number;
      total_threes: number;
    }>();

    if (seasonData) {
      for (const row of seasonData) {
        const playerId = row.player_id;
        const existing = playerMap.get(playerId);
        
        if (existing) {
          existing.total_games += row.games_played || 0;
          existing.total_points += row.total_points || 0;
          existing.total_threes += row.three_point || 0;
        } else {
          playerMap.set(playerId, {
            player_id: playerId,
            first_name: (row.players as any)?.first_name || '',
            last_name: (row.players as any)?.last_name || '',
            total_games: row.games_played || 0,
            total_points: row.total_points || 0,
            total_threes: row.three_point || 0,
          });
        }
      }
    }

    processedData = Array.from(playerMap.values())
      .filter(p => p.total_games >= 10)
      .map(p => ({
        player_id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        total_games: p.total_games,
        total_points: p.total_points,
        total_threes: p.total_threes,
        ppg: p.total_games > 0 ? +(p.total_points / p.total_games).toFixed(1) : 0,
      }));
  } else {
    // Use the player_aggregates view for all seasons
    const { data: allSeasonsData } = await supabase
      .from("player_aggregates")
      .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg");

    processedData = (allSeasonsData || [])
      .filter((r: any) => r.total_games >= 10)
      .map((r: any) => ({
        player_id: r.player_id,
        first_name: r.first_name,
        last_name: r.last_name,
        total_games: r.total_games,
        total_points: r.total_points,
        total_threes: r.total_threes,
        ppg: +r.ppg,
      }));
  }

  const mapRow = (r: any) => ({
    id: r.player_id,
    first_name: r.first_name,
    last_name: r.last_name,
    total_games: r.total_games,
    total_points: r.total_points,
    total_threes: r.total_threes,
    ppg: +r.ppg,
    threes_pg: r.total_games > 0 ? +(r.total_threes / r.total_games).toFixed(1) : 0,
  });

  // Sort by different criteria for each leaderboard
  const ppgData = [...processedData].sort((a, b) => b.ppg - a.ppg).slice(0, 100);
  const gamesData = [...processedData].sort((a, b) => b.total_games - a.total_games).slice(0, 100);
  const threesData = [...processedData].sort((a, b) => b.total_threes - a.total_threes).slice(0, 100);

  return {
    ppg: ppgData.map(mapRow),
    games: gamesData.map(mapRow),
    threes: threesData.map(mapRow),
  };
}

export async function getOrganisationById(id: string): Promise<Organisation | null> {
  const { data: organisation } = await supabase
    .from("organisations")
    .select("id, name, type, suburb, state, website")
    .eq("id", id)
    .single();

  if (!organisation) return null;

  return organisation as Organisation;
}

export async function getOrganisationTeams(organisationId: string): Promise<Team[]> {
  const { data: filtered } = await supabase
    .from("team_aggregates")
    .select("team_id, name, organisation_id, season_id, organisation_name, season_name, wins, losses, gp")
    .eq("organisation_id", organisationId);

  if (!filtered) return [];

  return filtered.map((t: any) => ({
    id: t.team_id,
    name: t.name,
    organisation_id: t.organisation_id,
    season_id: t.season_id,
    org_name: t.organisation_name || "",
    season_name: t.season_name || "",
    wins: t.wins,
    losses: t.losses,
    games_played: t.gp,
  }));
}

export async function getOrganisationPlayers(organisationId: string): Promise<{ id: string; first_name: string; last_name: string; total_games: number; total_points: number; ppg: number; team_name: string; }[]> {
  // Get all teams for this organisation
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("organisation_id", organisationId);

  if (!teams || teams.length === 0) return [];

  const teamIds = teams.map(t => t.id);
  
  // Get player stats for these teams
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      player_id, team_name, games_played, total_points,
      players!inner(first_name, last_name),
      grades!inner(teams!inner(id))
    `)
    .in("grades.teams.id", teamIds);

  if (!playerStats) return [];

  // Aggregate stats by player
  const playerMap = new Map<string, {
    id: string;
    first_name: string;
    last_name: string;
    total_games: number;
    total_points: number;
    teams: Set<string>;
  }>();

  for (const stat of playerStats) {
    const playerId = stat.player_id;
    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        id: playerId,
        first_name: (stat.players as any)?.first_name || '',
        last_name: (stat.players as any)?.last_name || '',
        total_games: 0,
        total_points: 0,
        teams: new Set(),
      });
    }
    
    const player = playerMap.get(playerId)!;
    player.total_games += stat.games_played || 0;
    player.total_points += stat.total_points || 0;
    player.teams.add(stat.team_name || '');
  }

  return Array.from(playerMap.values())
    .map(p => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      total_games: p.total_games,
      total_points: p.total_points,
      ppg: p.total_games > 0 ? +(p.total_points / p.total_games).toFixed(1) : 0,
      team_name: Array.from(p.teams).join(', '),
    }))
    .filter(p => p.total_games > 0)
    .sort((a, b) => b.total_points - a.total_points);
}

export async function getOrganisationStats(organisationId: string): Promise<{
  total_teams: number;
  total_players: number;
  total_games: number;
  top_scorer: { name: string; points: number } | null;
}> {
  // Get teams count
  const { data: teams, count: teamsCount } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  const totalTeams = teamsCount || 0;

  if (totalTeams === 0) {
    return {
      total_teams: 0,
      total_players: 0,
      total_games: 0,
      top_scorer: null,
    };
  }

  // Get players for this organisation
  const players = await getOrganisationPlayers(organisationId);
  const totalPlayers = players.length;

  // Get top scorer
  const topScorer = players.length > 0 ? {
    name: `${players[0].first_name} ${players[0].last_name}`,
    points: players[0].total_points,
  } : null;

  // Get games count (approximate based on teams)
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id")
    .eq("organisation_id", organisationId);

  let totalGames = 0;
  if (teamsData && teamsData.length > 0) {
    const teamIds = teamsData.map(t => t.id);
    const { data: homeGames, count: homeCount } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .in("home_team_id", teamIds);

    const { data: awayGames, count: awayCount } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .in("away_team_id", teamIds);

    totalGames = (homeCount || 0) + (awayCount || 0);
  }

  return {
    total_teams: totalTeams,
    total_players: totalPlayers,
    total_games: totalGames,
    top_scorer: topScorer,
  };
}

export type OrgAnalyticsData = {
  totalPlayers: number;
  totalGames: number;
  totalPoints: number;
  avgPPG: number;
  teamPerformance: Array<{
    name: string;
    season: string;
    wins: number;
    losses: number;
    gamesPlayed: number;
    winRate: number;
    ppg: number;
  }>;
  seasonGrowth: Array<{
    season: string;
    players: number;
    games: number;
  }>;
  topScorers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    total_games: number;
    total_points: number;
    ppg: number;
    team_name: string;
  }>;
  ageDistribution: Array<{
    group: string;
    count: number;
  }>;
};

export async function getOrganisationAnalytics(organisationId: string): Promise<OrgAnalyticsData> {
  // Get teams with season info
  const { data: teamAggs } = await supabase
    .from("team_aggregates")
    .select("team_id, name, season_name, wins, losses, gp")
    .eq("organisation_id", organisationId);

  const teams = teamAggs || [];

  // Get players
  const players = await getOrganisationPlayers(organisationId);

  const totalPlayers = players.length;
  const totalPoints = players.reduce((s, p) => s + p.total_points, 0);
  const totalGames = teams.reduce((s, t) => s + (t.gp || 0), 0);
  const avgPPG = totalPlayers > 0
    ? +(players.reduce((s, p) => s + p.ppg, 0) / totalPlayers).toFixed(1)
    : 0;

  // Team performance - compute PPG per team from player data
  const teamPointsMap = new Map<string, number>();
  const teamGamesMap = new Map<string, number>();
  for (const p of players) {
    const teamNames = p.team_name.split(", ");
    for (const tn of teamNames) {
      teamPointsMap.set(tn, (teamPointsMap.get(tn) || 0) + p.total_points);
      teamGamesMap.set(tn, Math.max(teamGamesMap.get(tn) || 0, p.total_games));
    }
  }

  const teamPerformance = teams.map(t => {
    const gp = t.gp || 0;
    const pts = teamPointsMap.get(t.name) || 0;
    return {
      name: t.name,
      season: t.season_name || "",
      wins: t.wins || 0,
      losses: t.losses || 0,
      gamesPlayed: gp,
      winRate: gp > 0 ? +((t.wins || 0) / gp * 100).toFixed(1) : 0,
      ppg: gp > 0 ? +(pts / gp).toFixed(1) : 0,
    };
  }).sort((a, b) => b.winRate - a.winRate);

  // Season growth
  const seasonMap = new Map<string, { players: Set<string>; games: number }>();
  // Use teams to group by season
  for (const t of teams) {
    const sn = t.season_name || "Unknown";
    if (!seasonMap.has(sn)) seasonMap.set(sn, { players: new Set(), games: 0 });
    seasonMap.get(sn)!.games += t.gp || 0;
  }
  // We don't have per-season player mapping easily, so approximate with team count
  // Get teams with season for player counts
  const { data: teamRows } = await supabase
    .from("teams")
    .select("id, name, season_id, seasons(name)")
    .eq("organisation_id", organisationId);

  if (teamRows) {
    const teamIdToSeason = new Map<string, string>();
    for (const tr of teamRows) {
      const sn = (tr.seasons as any)?.name || "Unknown";
      teamIdToSeason.set(tr.id, sn);
      if (!seasonMap.has(sn)) seasonMap.set(sn, { players: new Set(), games: 0 });
    }

    // Get player-team associations via player_stats
    const teamIds = teamRows.map(t => t.id);
    if (teamIds.length > 0) {
      const { data: ps } = await supabase
        .from("player_stats")
        .select("player_id, grades!inner(teams!inner(id, season_id, seasons(name)))")
        .in("grades.teams.id", teamIds);

      if (ps) {
        for (const row of ps) {
          const sn = (row.grades as any)?.teams?.seasons?.name || "Unknown";
          if (seasonMap.has(sn)) {
            seasonMap.get(sn)!.players.add(row.player_id);
          }
        }
      }
    }
  }

  const seasonGrowth = Array.from(seasonMap.entries())
    .map(([season, data]) => ({
      season,
      players: data.players.size,
      games: data.games,
    }))
    .sort((a, b) => a.season.localeCompare(b.season));

  // Top scorers - already sorted by total_points
  const topScorers = players.slice(0, 20);

  // Age distribution - check if players have date_of_birth
  const ageDistribution: Array<{ group: string; count: number }> = [];
  if (totalPlayers > 0) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("id")
      .eq("organisation_id", organisationId);

    if (teamData && teamData.length > 0) {
      const tIds = teamData.map(t => t.id);
      const { data: playerDobs } = await supabase
        .from("player_stats")
        .select("player_id, players!inner(date_of_birth), grades!inner(teams!inner(id))")
        .in("grades.teams.id", tIds);

      if (playerDobs) {
        const seen = new Set<string>();
        const ageBuckets = new Map<string, number>();
        const now = new Date();
        for (const row of playerDobs) {
          const dob = (row.players as any)?.date_of_birth;
          if (!dob || seen.has(row.player_id)) continue;
          seen.add(row.player_id);
          const age = Math.floor((now.getTime() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          let group: string;
          if (age < 10) group = "Under 10";
          else if (age < 13) group = "10-12";
          else if (age < 16) group = "13-15";
          else if (age < 19) group = "16-18";
          else if (age < 25) group = "19-24";
          else if (age < 35) group = "25-34";
          else group = "35+";
          ageBuckets.set(group, (ageBuckets.get(group) || 0) + 1);
        }
        const order = ["Under 10", "10-12", "13-15", "16-18", "19-24", "25-34", "35+"];
        for (const g of order) {
          if (ageBuckets.has(g)) ageDistribution.push({ group: g, count: ageBuckets.get(g)! });
        }
      }
    }
  }

  return {
    totalPlayers,
    totalGames,
    totalPoints,
    avgPPG,
    teamPerformance,
    seasonGrowth,
    topScorers,
    ageDistribution,
  };
}

// Helper function to extract region/suburb from organisation name
function extractRegion(orgName: string): string {
  // Remove common suffixes and prefixes
  const name = orgName.toLowerCase()
    .replace(/basketball.*/i, '')
    .replace(/\b(club|inc|association|assoc|academy|stadium|junior|senior|abl|vnbl|nbl1|big v|state championship)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Handle special cases with specific patterns
  const specialCases: Record<string, string> = {
    'aba wolverines': 'Albury/Wodonga',
    'aberfeldie jets': 'Aberfeldie',
    'aitken creek ravens': 'Aitken Creek',
    'alamanda': 'Berwick',
    'albert park': 'Albert Park',
    'albury': 'Albury',
    'altona': 'Altona',
    'altona bay': 'Altona',
    'altona gators': 'Altona',
    'altona laverton eagles': 'Altona/Laverton',
    'altona meadows sharks': 'Altona Meadows',
    'altona pirates': 'Altona',
    'anglesea aireys': 'Anglesea',
    'ararat': 'Ararat',
    'ashwood wolves': 'Ashwood',
    'aspendale gardens giants': 'Aspendale Gardens',
    'avondale raiders': 'Avondale',
    'bacchus marsh': 'Bacchus Marsh',
    'bairnsdale': 'Bairnsdale',
    'ballarat': 'Ballarat',
    'ballan brumbies': 'Ballan',
    'eastern districts': 'Eastern Melbourne',
    'eltham wildcats': 'Eltham',
    'box hill': 'Box Hill',
    'broadmeadows': 'Broadmeadows',
    'brunswick': 'Brunswick',
    'camberwell': 'Camberwell',
    'dandenong': 'Dandenong',
    'diamond valley': 'Diamond Valley',
    'doncaster': 'Doncaster',
    'footscray': 'Footscray',
    'frankston': 'Frankston',
    'geelong': 'Geelong',
    'hawthorn': 'Hawthorn',
    'heidelberg': 'Heidelberg',
    'keilor': 'Keilor',
    'knox': 'Knox',
    'melbourne': 'Melbourne',
    'monash': 'Monash',
    'northcote': 'Northcote',
    'oakleigh': 'Oakleigh',
    'preston': 'Preston',
    'richmond': 'Richmond',
    'ringwood': 'Ringwood',
    'sandringham': 'Sandringham',
    'st kilda': 'St Kilda',
    'sunshine': 'Sunshine',
    'waverley': 'Waverley',
    'werribee': 'Werribee',
    'williamstown': 'Williamstown',
    'bendigo': 'Bendigo',
    'shepparton': 'Shepparton',
    'warrnambool': 'Warrnambool',
    'mildura': 'Mildura',
    'horsham': 'Horsham',
    'traralgon': 'Traralgon',
    'morwell': 'Morwell',
    'sale': 'Sale',
    'wonthaggi': 'Wonthaggi',
    'colac': 'Colac',
    'portland': 'Portland',
    'hamilton': 'Hamilton',
    'apollo bay': 'Apollo Bay',
    'torquay': 'Torquay',
    'lorne': 'Lorne',
    'mount gambier': 'Mount Gambier',
    'millicent': 'Millicent',
    'naracoorte': 'Naracoorte'
  };

  // Check exact matches first
  if (specialCases[name]) {
    return specialCases[name];
  }

  // Check if any special case key is contained in the name
  for (const [key, value] of Object.entries(specialCases)) {
    if (name.includes(key)) {
      return value;
    }
  }

  // Try to extract first meaningful word(s)
  const words = name.split(' ').filter(w => w.length > 2);
  if (words.length > 0) {
    // Return first 1-2 meaningful words, capitalized
    const region = words.slice(0, 2).join(' ');
    return region.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return 'Other';
}

export type HeatmapRegion = {
  region: string;
  organisations: number;
  players: number;
  games: number;
  teams: number;
  density: number; // players per organisation
};

export async function getHeatmapData(): Promise<HeatmapRegion[]> {
  // Get all organisations with their stats
  const { data: organisations } = await supabase
    .from("organisations")
    .select(`
      id,
      name,
      competitions!inner(
        id,
        seasons!inner(
          id,
          grades!inner(
            id,
            player_stats(player_id, games_played, total_points)
          )
        )
      )
    `);

  if (!organisations) return [];

  // Build a map of region stats
  const regionMap = new Map<string, {
    organisations: Set<string>;
    players: Set<string>;
    games: number;
    teams: Set<string>;
  }>();

  // Get teams and games data separately for performance
  const { data: teams } = await supabase.from("teams").select("id, organisation_id");
  const { data: games } = await supabase.from("games").select("id, home_team_id, away_team_id");

  // Create lookup maps
  const teamsByOrg = new Map<string, string[]>();
  if (teams) {
    for (const team of teams) {
      if (!teamsByOrg.has(team.organisation_id)) {
        teamsByOrg.set(team.organisation_id, []);
      }
      teamsByOrg.get(team.organisation_id)!.push(team.id);
    }
  }

  // Process each organisation
  for (const org of organisations) {
    const region = extractRegion(org.name);
    
    if (!regionMap.has(region)) {
      regionMap.set(region, {
        organisations: new Set(),
        players: new Set(),
        games: 0,
        teams: new Set(),
      });
    }

    const regionData = regionMap.get(region)!;
    regionData.organisations.add(org.id);

    // Add teams for this organisation
    const orgTeams = teamsByOrg.get(org.id) || [];
    orgTeams.forEach(teamId => regionData.teams.add(teamId));

    // Process player stats
    for (const competition of org.competitions) {
      for (const season of competition.seasons) {
        for (const grade of season.grades) {
          for (const playerStat of grade.player_stats) {
            regionData.players.add(playerStat.player_id);
          }
        }
      }
    }

    // Count games for this organisation's teams
    if (games && orgTeams.length > 0) {
      const orgTeamSet = new Set(orgTeams);
      for (const game of games) {
        if (orgTeamSet.has(game.home_team_id) || orgTeamSet.has(game.away_team_id)) {
          regionData.games++;
        }
      }
    }
  }

  // Convert map to array with calculated metrics
  const result: HeatmapRegion[] = Array.from(regionMap.entries())
    .map(([region, data]) => ({
      region,
      organisations: data.organisations.size,
      players: data.players.size,
      games: data.games,
      teams: data.teams.size,
      density: data.organisations.size > 0 ? +(data.players.size / data.organisations.size).toFixed(1) : 0,
    }))
    .filter(r => r.players > 0) // Only include regions with actual players
    .sort((a, b) => b.players - a.players); // Sort by player count

  return result;
}

// Grade-related types and functions
export type Grade = {
  id: string;
  name: string;
  type: string | null;
  season_id: string;
  season_name: string;
  competition_id: string;
  competition_name: string;
  org_name: string;
};

export type GradeTeamStanding = {
  id: string;
  name: string;
  organisation_id: string;
  wins: number;
  losses: number;
  games_played: number;
  points_for: number;
  points_against: number;
  percentage: number;
  org_name: string;
};

export type GradeFixture = {
  id: string;
  round_name: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  court: string | null;
  status: string | null;
};

export async function getAllGrades(): Promise<Grade[]> {
  const { data } = await supabase
    .from("grades")
    .select(`
      id, name, type, season_id,
      seasons!inner(name, competition_id, competitions!inner(name, organisation_id, organisations!inner(name)))
    `)
    .order("name");

  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    season_id: g.season_id,
    season_name: (g.seasons as any)?.name || "",
    competition_id: (g.seasons as any)?.competition_id || "",
    competition_name: (g.seasons as any)?.competitions?.name || "",
    org_name: (g.seasons as any)?.competitions?.organisations?.name || "",
  }));
}

export async function getGradeById(id: string): Promise<Grade | null> {
  const { data: grade } = await supabase
    .from("grades")
    .select(`
      id, name, type, season_id,
      seasons!inner(name, competition_id, competitions!inner(name, organisation_id, organisations!inner(name)))
    `)
    .eq("id", id)
    .single();

  if (!grade) return null;

  return {
    id: grade.id,
    name: grade.name,
    type: grade.type,
    season_id: grade.season_id,
    season_name: (grade.seasons as any)?.name || "",
    competition_id: (grade.seasons as any)?.competition_id || "",
    competition_name: (grade.seasons as any)?.competitions?.name || "",
    org_name: (grade.seasons as any)?.competitions?.organisations?.name || "",
  };
}

export async function getGradeTeamStandings(gradeId: string): Promise<GradeTeamStanding[]> {
  // Get teams that have players in this grade (via player_stats)
  const { data: gradeTeams } = await supabase
    .from("player_stats")
    .select("team_name")
    .eq("grade_id", gradeId);

  if (!gradeTeams || gradeTeams.length === 0) return [];

  // Get unique team names
  const teamNames = [...new Set(gradeTeams.map(t => t.team_name).filter(Boolean))];

  // Get the season for this grade to find the actual teams
  const { data: gradeData } = await supabase
    .from("grades")
    .select("season_id")
    .eq("id", gradeId)
    .single();

  if (!gradeData) return [];

  // Get teams in this season that match the team names
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, organisation_id, organisations(name)")
    .eq("season_id", gradeData.season_id)
    .in("name", teamNames);

  if (!teams) return [];

  // Get all games for this grade
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("grade_id", gradeId)
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  // Calculate standings
  const standings = new Map<string, GradeTeamStanding>();

  for (const team of teams) {
    standings.set(team.id, {
      id: team.id,
      name: team.name,
      organisation_id: team.organisation_id,
      wins: 0,
      losses: 0,
      games_played: 0,
      points_for: 0,
      points_against: 0,
      percentage: 0,
      org_name: (team.organisations as any)?.name || "",
    });
  }

  // Process games
  if (games) {
    for (const game of games) {
      const homeTeam = standings.get(game.home_team_id);
      const awayTeam = standings.get(game.away_team_id);

      if (homeTeam && awayTeam) {
        homeTeam.games_played++;
        awayTeam.games_played++;
        homeTeam.points_for += game.home_score || 0;
        homeTeam.points_against += game.away_score || 0;
        awayTeam.points_for += game.away_score || 0;
        awayTeam.points_against += game.home_score || 0;

        if ((game.home_score || 0) > (game.away_score || 0)) {
          homeTeam.wins++;
          awayTeam.losses++;
        } else {
          awayTeam.wins++;
          homeTeam.losses++;
        }
      }
    }
  }

  // Calculate percentages and return sorted by wins
  return Array.from(standings.values())
    .map(team => ({
      ...team,
      percentage: team.points_against > 0 ? +(team.points_for / team.points_against * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.percentage - a.percentage;
    });
}

export async function getGradeTopScorers(gradeId: string, limit: number = 10): Promise<TopPlayer[]> {
  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      player_id, games_played, total_points,
      players!inner(first_name, last_name)
    `)
    .eq("grade_id", gradeId)
    .gte("games_played", 1);

  if (!stats) return [];

  // Aggregate by player (in case there are multiple entries)
  const playerMap = new Map<string, {
    id: string;
    first_name: string;
    last_name: string;
    total_games: number;
    total_points: number;
  }>();

  for (const stat of stats) {
    const playerId = stat.player_id;
    const existing = playerMap.get(playerId);
    
    if (existing) {
      existing.total_games += stat.games_played || 0;
      existing.total_points += stat.total_points || 0;
    } else {
      playerMap.set(playerId, {
        id: playerId,
        first_name: (stat.players as any)?.first_name || '',
        last_name: (stat.players as any)?.last_name || '',
        total_games: stat.games_played || 0,
        total_points: stat.total_points || 0,
      });
    }
  }

  return Array.from(playerMap.values())
    .map(p => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      total_games: p.total_games,
      total_points: p.total_points,
      ppg: p.total_games > 0 ? +(p.total_points / p.total_games).toFixed(1) : 0,
    }))
    .filter(p => p.total_games >= 3) // Minimum games filter
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit);
}

export async function getGradeFixtures(gradeId: string): Promise<GradeFixture[]> {
  const { data: fixtures } = await supabase
    .from("games")
    .select(`
      id, round_name, home_team_id, away_team_id, home_score, away_score,
      date, time, venue, court, status,
      home_teams:teams!home_team_id(name),
      away_teams:teams!away_team_id(name)
    `)
    .eq("grade_id", gradeId)
    .order("date", { ascending: true });

  if (!fixtures) return [];

  return fixtures.map((f: any) => ({
    id: f.id,
    round_name: f.round_name,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    home_team_name: f.home_teams?.name || "TBD",
    away_team_name: f.away_teams?.name || "TBD",
    home_score: f.home_score,
    away_score: f.away_score,
    date: f.date,
    time: f.time,
    venue: f.venue,
    court: f.court,
    status: f.status,
  }));
}

export async function searchGrades(options: {
  search?: string;
  seasonId?: string;
  competitionId?: string;
  orgId?: string;
}): Promise<Grade[]> {
  let query = supabase
    .from("grades")
    .select(`
      id, name, type, season_id,
      seasons!inner(name, competition_id, competitions!inner(name, organisation_id, organisations!inner(name)))
    `);

  // Apply filters
  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  if (options.seasonId) {
    query = query.eq("season_id", options.seasonId);
  }

  if (options.competitionId) {
    query = query.eq("seasons.competition_id", options.competitionId);
  }

  if (options.orgId) {
    query = query.eq("seasons.competitions.organisation_id", options.orgId);
  }

  const { data } = await query.order("name");

  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    season_id: g.season_id,
    season_name: (g.seasons as any)?.name || "",
    competition_id: (g.seasons as any)?.competition_id || "",
    competition_name: (g.seasons as any)?.competitions?.name || "",
    org_name: (g.seasons as any)?.competitions?.organisations?.name || "",
  }));
}


// Standings with PCT and DIFF
export type StandingsEntry = {
  rank: number;
  id: string;
  name: string;
  organisation_id: string;
  org_name: string;
  wins: number;
  losses: number;
  pct: number;
  points_for: number;
  points_against: number;
  diff: number;
};

export async function getGradeStandings(gradeId: string): Promise<StandingsEntry[]> {
  // Get the season for this grade
  const { data: gradeData } = await supabase
    .from("grades")
    .select("season_id")
    .eq("id", gradeId)
    .single();

  if (!gradeData) return [];

  // Get teams that have players in this grade (via player_stats)
  const { data: gradeTeams } = await supabase
    .from("player_stats")
    .select("team_name")
    .eq("grade_id", gradeId);

  if (!gradeTeams || gradeTeams.length === 0) return [];

  const teamNames = [...new Set(gradeTeams.map(t => t.team_name).filter(Boolean))];

  // Get teams in this season matching those names
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, organisation_id, organisations(name)")
    .eq("season_id", gradeData.season_id)
    .in("name", teamNames);

  if (!teams) return [];

  // Get all completed games for this grade
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("grade_id", gradeId)
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  // Build stats map
  const statsMap = new Map<string, { wins: number; losses: number; pf: number; pa: number; name: string; org_id: string; org_name: string }>();

  for (const team of teams) {
    statsMap.set(team.id, {
      wins: 0, losses: 0, pf: 0, pa: 0,
      name: team.name,
      org_id: team.organisation_id,
      org_name: (team.organisations as any)?.name || "",
    });
  }

  if (games) {
    for (const game of games) {
      const home = statsMap.get(game.home_team_id);
      const away = statsMap.get(game.away_team_id);
      if (home && away) {
        const hs = game.home_score || 0;
        const as_ = game.away_score || 0;
        home.pf += hs; home.pa += as_;
        away.pf += as_; away.pa += hs;
        if (hs > as_) { home.wins++; away.losses++; }
        else { away.wins++; home.losses++; }
      }
    }
  }

  // Build entries, sort by PCT desc then DIFF desc
  const entries: StandingsEntry[] = Array.from(statsMap.entries()).map(([id, s]) => {
    const gp = s.wins + s.losses;
    return {
      rank: 0,
      id,
      name: s.name,
      organisation_id: s.org_id,
      org_name: s.org_name,
      wins: s.wins,
      losses: s.losses,
      pct: gp > 0 ? +(s.wins / gp).toFixed(3) : 0,
      points_for: s.pf,
      points_against: s.pa,
      diff: s.pf - s.pa,
    };
  });

  entries.sort((a, b) => {
    if (a.pct !== b.pct) return b.pct - a.pct;
    return b.diff - a.diff;
  });

  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

// ==================== Finals / Playoff Bracket ====================

export type FinalsGame = {
  id: string;
  round_name: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  date: string | null;
  venue: string | null;
};

const FINALS_ROUND_ORDER: Record<string, number> = {
  "finals round 1": 0,
  "quarter finals": 1,
  "semi finals": 2,
  "preliminary final": 3,
  "preliminary finals": 3,
  "finals round 2": 3,
  "finals round 3": 4,
  "grand final": 5,
};

function finalsRoundOrder(roundName: string): number {
  return FINALS_ROUND_ORDER[roundName.toLowerCase()] ?? 99;
}

export async function getGradeFinalsGames(gradeId: string): Promise<FinalsGame[]> {
  const { data } = await supabase
    .from("games")
    .select(`
      id, round_name, home_team_id, away_team_id, home_score, away_score, date, venue,
      home_teams:teams!home_team_id(name),
      away_teams:teams!away_team_id(name)
    `)
    .eq("grade_id", gradeId)
    .or("round_name.ilike.%final%,round_name.ilike.%semi%,round_name.ilike.%preliminary%,round_name.ilike.%quarter%")
    .order("date", { ascending: true });

  if (!data || data.length === 0) return [];

  return data
    .map((g: any) => ({
      id: g.id,
      round_name: g.round_name || "",
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      home_team_name: g.home_teams?.name || "TBD",
      away_team_name: g.away_teams?.name || "TBD",
      home_score: g.home_score,
      away_score: g.away_score,
      date: g.date,
      venue: g.venue,
    }))
    .sort((a, b) => finalsRoundOrder(a.round_name) - finalsRoundOrder(b.round_name));
}

// Global search types and function for navbar search
export type GlobalSearchResults = {
  players: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; subtitle?: string }>;
  organisations: Array<{ id: string; name: string; subtitle?: string }>;
};

export async function globalSearch(query: string, limit: number = 5): Promise<GlobalSearchResults> {
  const searchQuery = query.toLowerCase().trim();
  
  if (searchQuery.length < 2) {
    return { players: [], teams: [], organisations: [] };
  }

  // Search players
  const { data: playersData } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, ppg")
    .or("first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%")
    .order("total_points", { ascending: false })
    .limit(limit);

  // Search teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, organisations(name)")
    .ilike("name", `%${searchQuery}%`)
    .limit(limit);

  // Search organisations
  const { data: orgsData } = await supabase
    .from("organisations")
    .select("id, name, suburb, state")
    .ilike("name", `%${searchQuery}%`)
    .limit(limit);

  return {
    players: (playersData || []).map(p => ({
      id: p.player_id,
      name: ` `,
    })),
    teams: (teamsData || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      subtitle: (t.organisations as any)?.name || "",
    })),
    organisations: (orgsData || []).map(o => ({
      id: o.id,
      name: o.name,
      subtitle: o.suburb && o.state ? `, ` : "",
    })),
  };
}

// Head-to-Head types and functions
export type HeadToHeadRecord = {
  team1_wins: number;
  team2_wins: number;
  total_games: number;
};

export type HeadToHeadGame = {
  id: string;
  date: string;
  team1_score: number;
  team2_score: number;
  team1_home: boolean;
  venue: string | null;
  season_name: string;
};

export type HeadToHeadPlayerComparison = {
  team1_top_scorers: Array<{
    player_id: string;
    first_name: string;
    last_name: string;
    total_points: number;
    games_played: number;
    ppg: number;
  }>;
  team2_top_scorers: Array<{
    player_id: string;
    first_name: string;
    last_name: string;
    total_points: number;
    games_played: number;
    ppg: number;
  }>;
};

export type HeadToHeadData = {
  record: HeadToHeadRecord;
  recent_games: HeadToHeadGame[];
  player_comparison: HeadToHeadPlayerComparison;
  average_differential: {
    team1_avg: number;
    team2_avg: number;
    differential: number;
  };
};

export async function getHeadToHeadData(team1Id: string, team2Id: string): Promise<HeadToHeadData | null> {
  // Get all games between these two teams
  const { data: games } = await supabase
    .from("games")
    .select(`
      id, date, home_team_id, away_team_id, home_score, away_score, venue,
      seasons(name)
    `)
    .or(`and(home_team_id.eq.${team1Id},away_team_id.eq.${team2Id}),and(home_team_id.eq.${team2Id},away_team_id.eq.${team1Id})`)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("date", { ascending: false });

  if (!games || games.length === 0) {
    return {
      record: { team1_wins: 0, team2_wins: 0, total_games: 0 },
      recent_games: [],
      player_comparison: { team1_top_scorers: [], team2_top_scorers: [] },
      average_differential: { team1_avg: 0, team2_avg: 0, differential: 0 },
    };
  }

  // Calculate record and process games
  let team1Wins = 0, team2Wins = 0;
  let team1TotalScore = 0, team2TotalScore = 0;
  const recentGames: HeadToHeadGame[] = [];

  for (const game of games) {
    const team1IsHome = game.home_team_id === team1Id;
    const team1Score = team1IsHome ? game.home_score : game.away_score;
    const team2Score = team1IsHome ? game.away_score : game.home_score;

    if (team1Score > team2Score) team1Wins++;
    else team2Wins++;

    team1TotalScore += team1Score;
    team2TotalScore += team2Score;

    recentGames.push({
      id: game.id,
      date: game.date,
      team1_score: team1Score,
      team2_score: team2Score,
      team1_home: team1IsHome,
      venue: game.venue,
      season_name: (game.seasons as any)?.name || '',
    });
  }

  // Get recent 5 games
  const recent5Games = recentGames.slice(0, 5);

  // Get top scorers for each team
  const [team1Players, team2Players] = await Promise.all([
    getTeamTopScorers(team1Id),
    getTeamTopScorers(team2Id),
  ]);

  // Calculate averages
  const totalGames = games.length;
  const team1Avg = totalGames > 0 ? +(team1TotalScore / totalGames).toFixed(1) : 0;
  const team2Avg = totalGames > 0 ? +(team2TotalScore / totalGames).toFixed(1) : 0;

  return {
    record: {
      team1_wins: team1Wins,
      team2_wins: team2Wins,
      total_games: totalGames,
    },
    recent_games: recent5Games,
    player_comparison: {
      team1_top_scorers: team1Players,
      team2_top_scorers: team2Players,
    },
    average_differential: {
      team1_avg: team1Avg,
      team2_avg: team2Avg,
      differential: +(team1Avg - team2Avg).toFixed(1),
    },
  };
}

export async function getTeamTopScorers(teamId: string): Promise<Array<{
  player_id: string;
  first_name: string;
  last_name: string;
  total_points: number;
  games_played: number;
  ppg: number;
}>> {
  // Get the team to find its season and name
  const { data: team } = await supabase
    .from("teams")
    .select("name, season_id")
    .eq("id", teamId)
    .single();

  if (!team) return [];

  // Get grades for this season
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .eq("season_id", team.season_id);

  if (!grades || grades.length === 0) return [];

  const gradeIds = grades.map(g => g.id);

  // Get player stats for this team
  const { data: stats } = await supabase
    .from("player_stats")
    .select(`
      player_id, games_played, total_points,
      players!inner(first_name, last_name)
    `)
    .eq("team_name", team.name)
    .in("grade_id", gradeIds)
    .gte("games_played", 3)
    .order("total_points", { ascending: false })
    .limit(5);

  if (!stats) return [];

  return stats.map(s => ({
    player_id: s.player_id,
    first_name: (s.players as any)?.first_name || '',
    last_name: (s.players as any)?.last_name || '',
    total_points: s.total_points || 0,
    games_played: s.games_played || 0,
    ppg: s.games_played > 0 ? +((s.total_points || 0) / s.games_played).toFixed(1) : 0,
  }));
}

// ==================== Season Awards ====================

export type AwardWinner = {
  id: string;
  name: string;
  stat_label: string;
  stat_value: string;
  team_name: string;
  type: "player" | "team";
};

export type SeasonAwards = {
  mvp: AwardWinner | null;
  top_scorer: AwardWinner | null;
  most_improved: AwardWinner | null;
  sharpshooter: AwardWinner | null;
  iron_man: AwardWinner | null;
  best_team: AwardWinner | null;
};

export async function getAwardSeasons(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("seasons")
    .select("id, name")
    .order("start_date", { ascending: false });

  if (!data) return [];

  // Deduplicate by season name (multiple competitions share the same season name)
  const seen = new Map<string, string>();
  for (const s of data) {
    if (!seen.has(s.name)) seen.set(s.name, s.id);
  }
  return Array.from(seen.entries()).map(([name, id]) => ({ id, name }));
}

export async function getSeasonAwards(seasonName: string): Promise<SeasonAwards> {
  // Get all season IDs matching this name
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("name", seasonName);

  const seasonIds = (seasons || []).map(s => s.id);
  if (seasonIds.length === 0) return { mvp: null, top_scorer: null, most_improved: null, sharpshooter: null, iron_man: null, best_team: null };

  // Get all grades for these seasons
  const { data: grades } = await supabase
    .from("grades")
    .select("id")
    .in("season_id", seasonIds);

  const gradeIds = (grades || []).map(g => g.id);
  if (gradeIds.length === 0) return { mvp: null, top_scorer: null, most_improved: null, sharpshooter: null, iron_man: null, best_team: null };

  // Get all player stats for these grades
  const allStats: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("player_stats")
      .select("player_id, team_name, games_played, total_points, three_point, players!inner(first_name, last_name)")
      .in("grade_id", gradeIds)
      .range(from, from + PAGE - 1);
    if (!batch || batch.length === 0) break;
    allStats.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  // Aggregate by player
  const playerMap = new Map<string, {
    id: string; first_name: string; last_name: string; team_name: string;
    games: number; points: number; threes: number;
  }>();

  for (const s of allStats) {
    const pid = s.player_id;
    const ex = playerMap.get(pid);
    if (ex) {
      ex.games += s.games_played || 0;
      ex.points += s.total_points || 0;
      ex.threes += s.three_point || 0;
    } else {
      playerMap.set(pid, {
        id: pid,
        first_name: (s.players as any)?.first_name || "",
        last_name: (s.players as any)?.last_name || "",
        team_name: s.team_name || "",
        games: s.games_played || 0,
        points: s.total_points || 0,
        threes: s.three_point || 0,
      });
    }
  }

  const players = Array.from(playerMap.values());

  // MVP: highest PPG, min 10 games
  const mvpCandidates = players.filter(p => p.games >= 10).sort((a, b) => (b.points / b.games) - (a.points / a.games));
  const mvp = mvpCandidates[0] ? {
    id: mvpCandidates[0].id,
    name: `${mvpCandidates[0].first_name} ${mvpCandidates[0].last_name}`,
    stat_label: "PPG",
    stat_value: (mvpCandidates[0].points / mvpCandidates[0].games).toFixed(1),
    team_name: mvpCandidates[0].team_name,
    type: "player" as const,
  } : null;

  // Top Scorer: most total points
  const scorers = [...players].sort((a, b) => b.points - a.points);
  const top_scorer = scorers[0] ? {
    id: scorers[0].id,
    name: `${scorers[0].first_name} ${scorers[0].last_name}`,
    stat_label: "Total Points",
    stat_value: scorers[0].points.toLocaleString(),
    team_name: scorers[0].team_name,
    type: "player" as const,
  } : null;

  // Sharpshooter: highest 3PT per game, min 5 GP
  const shooters = players.filter(p => p.games >= 5).sort((a, b) => (b.threes / b.games) - (a.threes / a.games));
  const sharpshooter = shooters[0] ? {
    id: shooters[0].id,
    name: `${shooters[0].first_name} ${shooters[0].last_name}`,
    stat_label: "3PT/Game",
    stat_value: (shooters[0].threes / shooters[0].games).toFixed(1),
    team_name: shooters[0].team_name,
    type: "player" as const,
  } : null;

  // Iron Man: most games played
  const ironCandidates = [...players].sort((a, b) => b.games - a.games);
  const iron_man = ironCandidates[0] ? {
    id: ironCandidates[0].id,
    name: `${ironCandidates[0].first_name} ${ironCandidates[0].last_name}`,
    stat_label: "Games Played",
    stat_value: ironCandidates[0].games.toString(),
    team_name: ironCandidates[0].team_name,
    type: "player" as const,
  } : null;

  // Most Improved: biggest PPG increase from previous season
  // Get the previous season name for comparison
  const { data: allSeasons } = await supabase
    .from("seasons")
    .select("name, start_date")
    .order("start_date", { ascending: false });

  let most_improved: AwardWinner | null = null;
  if (allSeasons) {
    const uniqueNames = [...new Set(allSeasons.map(s => s.name))];
    const currentIdx = uniqueNames.indexOf(seasonName);
    if (currentIdx >= 0 && currentIdx < uniqueNames.length - 1) {
      const prevSeasonName = uniqueNames[currentIdx + 1];
      // Get previous season stats
      const { data: prevSeasons } = await supabase
        .from("seasons")
        .select("id")
        .eq("name", prevSeasonName);
      const prevIds = (prevSeasons || []).map(s => s.id);
      if (prevIds.length > 0) {
        const { data: prevGrades } = await supabase
          .from("grades")
          .select("id")
          .in("season_id", prevIds);
        const prevGradeIds = (prevGrades || []).map(g => g.id);
        if (prevGradeIds.length > 0) {
          const prevStats: any[] = [];
          let pFrom = 0;
          while (true) {
            const { data: batch } = await supabase
              .from("player_stats")
              .select("player_id, games_played, total_points")
              .in("grade_id", prevGradeIds)
              .range(pFrom, pFrom + PAGE - 1);
            if (!batch || batch.length === 0) break;
            prevStats.push(...batch);
            if (batch.length < PAGE) break;
            pFrom += PAGE;
          }
          const prevMap = new Map<string, { games: number; points: number }>();
          for (const s of prevStats) {
            const ex = prevMap.get(s.player_id);
            if (ex) { ex.games += s.games_played || 0; ex.points += s.total_points || 0; }
            else prevMap.set(s.player_id, { games: s.games_played || 0, points: s.total_points || 0 });
          }

          let bestImprovement = -Infinity;
          let bestPlayer: typeof players[0] | null = null;
          let bestPrevPpg = 0;
          let bestCurrPpg = 0;
          for (const p of players) {
            if (p.games < 5) continue;
            const prev = prevMap.get(p.id);
            if (!prev || prev.games < 5) continue;
            const currPpg = p.points / p.games;
            const prevPpg = prev.points / prev.games;
            const improvement = currPpg - prevPpg;
            if (improvement > bestImprovement) {
              bestImprovement = improvement;
              bestPlayer = p;
              bestPrevPpg = prevPpg;
              bestCurrPpg = currPpg;
            }
          }
          if (bestPlayer && bestImprovement > 0) {
            most_improved = {
              id: bestPlayer.id,
              name: `${bestPlayer.first_name} ${bestPlayer.last_name}`,
              stat_label: "PPG Increase",
              stat_value: `+${bestImprovement.toFixed(1)} (${bestPrevPpg.toFixed(1)} → ${bestCurrPpg.toFixed(1)})`,
              team_name: bestPlayer.team_name,
              type: "player",
            };
          }
        }
      }
    }
  }

  // Best Team: highest win percentage, min 10 games
  const { data: teamAggs } = await supabase
    .from("team_aggregates")
    .select("team_id, name, organisation_name, season_id, wins, losses, gp")
    .in("season_id", seasonIds);

  let best_team: AwardWinner | null = null;
  if (teamAggs) {
    const qualified = teamAggs.filter(t => t.gp >= 10).sort((a, b) => {
      const aPct = a.wins / a.gp;
      const bPct = b.wins / b.gp;
      return bPct - aPct;
    });
    if (qualified[0]) {
      const pct = ((qualified[0].wins / qualified[0].gp) * 100).toFixed(0);
      best_team = {
        id: qualified[0].team_id,
        name: qualified[0].name,
        stat_label: "Win %",
        stat_value: `${pct}% (${qualified[0].wins}W-${qualified[0].losses}L)`,
        team_name: qualified[0].organisation_name || "",
        type: "team",
      };
    }
  }

  return { mvp, top_scorer, most_improved, sharpshooter, iron_man, best_team };
}

export async function getGameDetails(gameId: string) {
  const { data: game } = await supabase
    .from("games")
    .select(`
      id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      venue,
      date,
      time,
      round_id
    `)
    .eq("id", gameId)
    .single();

  if (!game) return null;

  // Get team details separately
  const { data: homeTeam } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("id", game.home_team_id)
    .single();

  const { data: awayTeam } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("id", game.away_team_id)
    .single();

  // Get round details separately
  const { data: round } = await supabase
    .from("rounds")
    .select(`
      id, 
      name,
      grade_id
    `)
    .eq("id", game.round_id)
    .single();

  // Get grade details if round exists
  let grade = null;
  if (round) {
    const { data: gradeData } = await supabase
      .from("grades")
      .select(`
        id, 
        name, 
        season_id
      `)
      .eq("id", round.grade_id)
      .single();
    
    if (gradeData) {
      // Get season details
      const { data: season } = await supabase
        .from("seasons")
        .select(`
          id, 
          name,
          competition_id
        `)
        .eq("id", gradeData.season_id)
        .single();
      
      if (season) {
        // Get competition details
        const { data: competition } = await supabase
          .from("competitions")
          .select(`
            id,
            name,
            organisation_id
          `)
          .eq("id", season.competition_id)
          .single();
        
        if (competition) {
          // Get organisation details
          const { data: organisation } = await supabase
            .from("organisations")
            .select("id, name")
            .eq("id", competition.organisation_id)
            .single();
          
          grade = {
            ...gradeData,
            season: {
              ...season,
              competition: {
                ...competition,
                organisation: organisation,
              },
            },
          };
        }
      }
    }
  }

  return {
    ...game,
    home_team: homeTeam,
    away_team: awayTeam,
    round: round ? {
      ...round,
      grade: grade,
    } : null,
  };
}

// ==================== Recent Activity Feed ====================

export type RecentGame = {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  date: string;
  grade_name: string;
  competition_name: string;
  is_close_game: boolean; // margin <= 5 points
  margin: number;
};

export type FeaturedGame = {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  date: string;
  grade_name: string;
  competition_name: string;
  margin: number;
  type: 'blowout' | 'close';
};

export type DailyGameCount = {
  date: string;      // e.g. "Mon", "Tue"
  fullDate: string;   // e.g. "2026-02-03"
  games: number;
  points: number;
};

export type WeeklyNumbers = {
  total_games: number;
  total_points: number;
  avg_margin: number;
  close_game_pct: number; // percentage of games within 5 points
  daily_breakdown: DailyGameCount[];
  highest_scorer: {
    player_name: string;
    points: number;
    team_name: string;
  } | null;
};

export async function getRecentGames(limit: number = 20): Promise<RecentGame[]> {
  const { data: games } = await supabase
    .from("games")
    .select(`
      id,
      home_score,
      away_score,
      date,
      home_teams:teams!home_team_id(name),
      away_teams:teams!away_team_id(name),
      grades!inner(name, seasons!inner(competitions!inner(name)))
    `)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("date", { ascending: false })
    .limit(limit);

  if (!games) return [];

  return games.map((game: any) => {
    const homeScore = game.home_score || 0;
    const awayScore = game.away_score || 0;
    const margin = Math.abs(homeScore - awayScore);
    
    return {
      id: game.id,
      home_team_name: game.home_teams?.name || "TBD",
      away_team_name: game.away_teams?.name || "TBD",
      home_score: homeScore,
      away_score: awayScore,
      date: game.date,
      grade_name: (game.grades as any)?.name || "",
      competition_name: (game.grades as any)?.seasons?.competitions?.name || "",
      is_close_game: margin <= 5,
      margin,
    };
  });
}

export async function getWeeklyFeaturedGames(): Promise<{ closest: FeaturedGame | null; blowout: FeaturedGame | null }> {
  // Get games from the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekStart = oneWeekAgo.toISOString().split('T')[0];

  const { data: weeklyGames } = await supabase
    .from("games")
    .select(`
      id,
      home_score,
      away_score,
      date,
      home_teams:teams!home_team_id(name),
      away_teams:teams!away_team_id(name),
      grades!inner(name, seasons!inner(competitions!inner(name)))
    `)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .gte("date", weekStart)
    .order("date", { ascending: false });

  if (!weeklyGames || weeklyGames.length === 0) {
    return { closest: null, blowout: null };
  }

  let closestGame: FeaturedGame | null = null;
  let blowoutGame: FeaturedGame | null = null;
  let minMargin = Infinity;
  let maxMargin = 0;

  for (const game of weeklyGames) {
    const homeScore = game.home_score || 0;
    const awayScore = game.away_score || 0;
    const margin = Math.abs(homeScore - awayScore);

    const featuredGame: FeaturedGame = {
      id: game.id,
      home_team_name: (game.home_teams as any)?.name || "TBD",
      away_team_name: (game.away_teams as any)?.name || "TBD",
      home_score: homeScore,
      away_score: awayScore,
      date: game.date,
      grade_name: (game.grades as any)?.name || "",
      competition_name: (game.grades as any)?.seasons?.competitions?.name || "",
      margin,
      type: margin <= 5 ? 'close' : 'blowout',
    };

    // Track closest game
    if (margin < minMargin) {
      minMargin = margin;
      closestGame = { ...featuredGame, type: 'close' };
    }

    // Track biggest blowout
    if (margin > maxMargin) {
      maxMargin = margin;
      blowoutGame = { ...featuredGame, type: 'blowout' };
    }
  }

  return { closest: closestGame, blowout: blowoutGame };
}

export async function getThisWeekInNumbers(): Promise<WeeklyNumbers> {
  // Get games from the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekStart = oneWeekAgo.toISOString().split('T')[0];

  // Get all scores for total points and daily breakdown
  const { data: gamesWithScores } = await supabase
    .from("games")
    .select("home_score, away_score, date")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .gte("date", weekStart);

  const allGames = gamesWithScores || [];
  const totalGames = allGames.length;

  let totalPoints = 0;
  let totalMargin = 0;
  let closeGames = 0;

  // Build daily breakdown map
  const dailyMap = new Map<string, { games: number; points: number }>();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialise all 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(oneWeekAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, { games: 0, points: 0 });
  }

  for (const game of allGames) {
    const hs = game.home_score || 0;
    const as_ = game.away_score || 0;
    const pts = hs + as_;
    const margin = Math.abs(hs - as_);
    totalPoints += pts;
    totalMargin += margin;
    if (margin <= 5) closeGames++;

    const dateKey = game.date;
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.games++;
      existing.points += pts;
    } else {
      dailyMap.set(dateKey, { games: 1, points: pts });
    }
  }

  const daily_breakdown: DailyGameCount[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, v]) => {
      const d = new Date(dateStr + 'T00:00:00');
      return {
        date: dayNames[d.getDay()],
        fullDate: dateStr,
        games: v.games,
        points: v.points,
      };
    });

  // Get highest individual scorer this week
  const { data: weeklyPlayerStats } = await supabase
    .from("player_stats")
    .select(`
      player_id,
      total_points,
      team_name,
      players!inner(first_name, last_name),
      grades!inner(
        id,
        games!inner(date)
      )
    `)
    .gte("grades.games.date", weekStart);

  let highestScorer: WeeklyNumbers['highest_scorer'] = null;
  
  if (weeklyPlayerStats && weeklyPlayerStats.length > 0) {
    let maxPoints = 0;
    for (const stat of weeklyPlayerStats) {
      const points = stat.total_points || 0;
      if (points > maxPoints) {
        maxPoints = points;
        highestScorer = {
          player_name: `${(stat.players as any)?.first_name || ""} ${(stat.players as any)?.last_name || ""}`.trim(),
          points,
          team_name: stat.team_name || "",
        };
      }
    }
  }

  return {
    total_games: totalGames,
    total_points: totalPoints,
    avg_margin: totalGames > 0 ? +(totalMargin / totalGames).toFixed(1) : 0,
    close_game_pct: totalGames > 0 ? +((closeGames / totalGames) * 100).toFixed(0) : 0,
    daily_breakdown,
    highest_scorer: highestScorer,
  };
}

// ── Team Schedule ──────────────────────────────────────────────

export interface TeamScheduleGame {
  id: string;
  date: string;
  time: string | null;
  venue: string | null;
  round_name: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  season_id: string;
  season_name: string;
}

export async function getTeamSchedule(teamId: string): Promise<TeamScheduleGame[]> {
  const { data: games } = await supabase
    .from("games")
    .select(`
      id, date, time, venue, round_name,
      home_team_id, away_team_id, home_score, away_score,
      season_id, seasons(name),
      home_teams:teams!home_team_id(name),
      away_teams:teams!away_team_id(name)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("date", { ascending: false });

  if (!games) return [];

  return games.map((g: any) => ({
    id: g.id,
    date: g.date,
    time: g.time,
    venue: g.venue,
    round_name: g.round_name,
    home_team_id: g.home_team_id,
    away_team_id: g.away_team_id,
    home_team_name: g.home_teams?.name || "TBD",
    away_team_name: g.away_teams?.name || "TBD",
    home_score: g.home_score,
    away_score: g.away_score,
    season_id: g.season_id,
    season_name: (g.seasons as any)?.name || "Unknown Season",
  }));
}

export async function getSeasonsList(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("seasons")
    .select("id, name")
    .order("name", { ascending: false });
  return data || [];
}
