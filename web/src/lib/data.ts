import { supabase } from "./supabase";

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
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)");

  if (!teams) return [];

  // Get win/loss from games
  const games = await fetchAllRows("games", "home_team_id, away_team_id, home_score, away_score");

  const wlMap = new Map<string, { wins: number; losses: number; gp: number }>();
  if (games.length) {
    for (const g of games) {
      if (g.home_score == null || g.away_score == null) continue;
      const homeWin = g.home_score > g.away_score;

      for (const [tid, isHome] of [[g.home_team_id, true], [g.away_team_id, false]] as [string, boolean][]) {
        if (!tid) continue;
        const rec = wlMap.get(tid) || { wins: 0, losses: 0, gp: 0 };
        rec.gp++;
        if ((isHome && homeWin) || (!isHome && !homeWin)) rec.wins++;
        else rec.losses++;
        wlMap.set(tid, rec);
      }
    }
  }

  return teams.map((t: any) => {
    const wl = wlMap.get(t.id) || { wins: 0, losses: 0, gp: 0 };
    return {
      id: t.id,
      name: t.name,
      organisation_id: t.organisation_id,
      season_id: t.season_id,
      org_name: (t.organisations as any)?.name || "",
      season_name: (t.seasons as any)?.name || "",
      wins: wl.wins,
      losses: wl.losses,
      games_played: wl.gp,
    };
  });
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
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, organisation_id, season_id, organisations(name), seasons(name)")
    .eq("organisation_id", organisationId);

  if (!teams) return [];

  // Get win/loss from games for all teams
  const teamIds = teams.map(t => t.id);
  const games = await fetchAllRows("games", "home_team_id, away_team_id, home_score, away_score");

  const wlMap = new Map<string, { wins: number; losses: number; gp: number }>();
  if (games.length) {
    for (const g of games) {
      if (g.home_score == null || g.away_score == null) continue;
      const homeWin = g.home_score > g.away_score;

      for (const [tid, isHome] of [[g.home_team_id, true], [g.away_team_id, false]] as [string, boolean][]) {
        if (!tid || !teamIds.includes(tid)) continue;
        const rec = wlMap.get(tid) || { wins: 0, losses: 0, gp: 0 };
        rec.gp++;
        if ((isHome && homeWin) || (!isHome && !homeWin)) rec.wins++;
        else rec.losses++;
        wlMap.set(tid, rec);
      }
    }
  }

  return teams.map((t: any) => {
    const wl = wlMap.get(t.id) || { wins: 0, losses: 0, gp: 0 };
    return {
      id: t.id,
      name: t.name,
      organisation_id: t.organisation_id,
      season_id: t.season_id,
      org_name: (t.organisations as any)?.name || "",
      season_name: (t.seasons as any)?.name || "",
      wins: wl.wins,
      losses: wl.losses,
      games_played: wl.gp,
    };
  });
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

// Helper function to extract region/suburb from organisation name
function extractRegion(orgName: string): string {
  // Remove common suffixes and prefixes
  let name = orgName.toLowerCase()
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
