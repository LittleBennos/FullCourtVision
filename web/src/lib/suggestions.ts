import { supabase } from "./supabase";

export async function getSimilarPlayers(limit = 5) {
  const { data } = await supabase
    .from("player_totals")
    .select("id, first_name, last_name, total_points")
    .order("total_points", { ascending: false })
    .limit(limit);
  return (data || []).map((p: any) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    href: `/players/${p.id}`,
  }));
}

export async function getSimilarTeams(limit = 5) {
  const { data } = await supabase
    .from("team_aggregates")
    .select("id, name, org_name")
    .order("games_played", { ascending: false })
    .limit(limit);
  return (data || []).map((t: any) => ({
    id: t.id,
    name: `${t.name} — ${t.org_name}`,
    href: `/teams/${t.id}`,
  }));
}

export async function getSimilarOrganisations(limit = 5) {
  const { data } = await supabase
    .from("organisations")
    .select("id, name, suburb")
    .order("name")
    .limit(limit);
  return (data || []).map((o: any) => ({
    id: o.id,
    name: o.suburb ? `${o.name} (${o.suburb})` : o.name,
    href: `/organisations/${o.id}`,
  }));
}

export async function getSimilarGrades(limit = 5) {
  const { data } = await supabase
    .from("grades")
    .select("id, name")
    .order("name")
    .limit(limit);
  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    href: `/grades/${g.id}`,
  }));
}

export async function getSimilarGames(limit = 5) {
  const { data } = await supabase
    .from("games")
    .select("id, date, venue")
    .order("date", { ascending: false })
    .limit(limit);
  return (data || []).map((g: any) => ({
    id: g.id,
    name: `${g.date || "Unknown date"}${g.venue ? ` at ${g.venue}` : ""}`,
    href: `/games/${g.id}`,
  }));
}
