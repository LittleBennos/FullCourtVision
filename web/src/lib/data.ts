import { supabase } from "./supabase";

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
  // Aggregate player_stats per player via RPC or just query player_stats grouped
  // Since Supabase doesn't support GROUP BY directly, we query player_stats and aggregate client-side
  // But with 57k players that's too much data. Let's use a view or just query players + stats separately.
  
  // Actually, let's query all player_stats and aggregate
  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points");

  if (!stats) return [];

  // Build aggregation map
  const map = new Map<string, { total_games: number; total_points: number }>();
  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (existing) {
      existing.total_games += s.games_played || 0;
      existing.total_points += s.total_points || 0;
    } else {
      map.set(s.player_id, {
        total_games: s.games_played || 0,
        total_points: s.total_points || 0,
      });
    }
  }

  // Get all players
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name");

  if (!players) return [];

  return players.map((p) => {
    const agg = map.get(p.id) || { total_games: 0, total_points: 0 };
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      total_games: agg.total_games,
      total_points: agg.total_points,
      ppg: agg.total_games > 0 ? +((agg.total_points / agg.total_games).toFixed(1)) : 0,
    };
  });
}

export async function getTopPlayers(): Promise<TopPlayer[]> {
  // Get all players with stats, sorted by total_points desc, limit 500
  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points");

  if (!stats) return [];

  const map = new Map<string, { total_games: number; total_points: number }>();
  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (existing) {
      existing.total_games += s.games_played || 0;
      existing.total_points += s.total_points || 0;
    } else {
      map.set(s.player_id, {
        total_games: s.games_played || 0,
        total_points: s.total_points || 0,
      });
    }
  }

  // Get top 500 player IDs by total_points
  const sorted = [...map.entries()]
    .sort((a, b) => b[1].total_points - a[1].total_points)
    .slice(0, 500);

  const playerIds = sorted.map(([id]) => id);

  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in("id", playerIds);

  if (!players) return [];

  const playerMap = new Map(players.map((p) => [p.id, p]));

  return sorted
    .map(([id, agg]) => {
      const p = playerMap.get(id);
      if (!p) return null;
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        total_games: agg.total_games,
        total_points: agg.total_points,
        ppg: agg.total_games > 0 ? +((agg.total_points / agg.total_games).toFixed(1)) : 0,
      };
    })
    .filter(Boolean) as TopPlayer[];
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
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score");

  const wlMap = new Map<string, { wins: number; losses: number; gp: number }>();
  if (games) {
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
  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, games_played, total_points, three_point");

  if (!stats) return { ppg: [], games: [], threes: [] };

  const map = new Map<string, { total_games: number; total_points: number; total_threes: number }>();
  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (existing) {
      existing.total_games += s.games_played || 0;
      existing.total_points += s.total_points || 0;
      existing.total_threes += s.three_point || 0;
    } else {
      map.set(s.player_id, {
        total_games: s.games_played || 0,
        total_points: s.total_points || 0,
        total_threes: s.three_point || 0,
      });
    }
  }

  // Filter min 10 games
  const qualified = [...map.entries()].filter(([, v]) => v.total_games >= 10);

  // Get all qualified player IDs
  const playerIds = qualified.map(([id]) => id);

  // Batch fetch players (Supabase .in() has limits, batch in chunks)
  const playerMap = new Map<string, { first_name: string; last_name: string }>();
  const chunkSize = 500;
  for (let i = 0; i < playerIds.length; i += chunkSize) {
    const chunk = playerIds.slice(i, i + chunkSize);
    const { data: players } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", chunk);
    if (players) {
      for (const p of players) playerMap.set(p.id, p);
    }
  }

  const withNames = qualified
    .map(([id, agg]) => {
      const p = playerMap.get(id);
      if (!p) return null;
      return {
        id,
        first_name: p.first_name,
        last_name: p.last_name,
        total_games: agg.total_games,
        total_points: agg.total_points,
        total_threes: agg.total_threes,
        ppg: +((agg.total_points / agg.total_games).toFixed(1)),
        threes_pg: +((agg.total_threes / agg.total_games).toFixed(1)),
      };
    })
    .filter(Boolean) as any[];

  const ppg = [...withNames].sort((a, b) => b.ppg - a.ppg).slice(0, 100);
  const games = [...withNames].sort((a, b) => b.total_games - a.total_games).slice(0, 100);
  const threes = [...withNames].sort((a, b) => b.total_threes - a.total_threes).slice(0, 100);

  return { ppg, games, threes };
}
