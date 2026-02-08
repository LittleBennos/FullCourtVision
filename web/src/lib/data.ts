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

export async function getLeaderboards(): Promise<{ ppg: any[]; games: any[]; threes: any[] }> {
  // Use the player_aggregates view — all aggregation done server-side
  // Fetch players with min 10 games
  const { data: ppgData } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg")
    .gte("total_games", 10)
    .order("ppg", { ascending: false })
    .limit(100);

  const { data: gamesData } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg")
    .gte("total_games", 10)
    .order("total_games", { ascending: false })
    .limit(100);

  const { data: threesData } = await supabase
    .from("player_aggregates")
    .select("player_id, first_name, last_name, total_games, total_points, total_threes, ppg")
    .gte("total_games", 10)
    .order("total_threes", { ascending: false })
    .limit(100);

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

  return {
    ppg: (ppgData || []).map(mapRow),
    games: (gamesData || []).map(mapRow),
    threes: (threesData || []).map(mapRow),
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
