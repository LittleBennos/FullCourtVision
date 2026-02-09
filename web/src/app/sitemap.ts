import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://fullcourtvision.vercel.app";
const BATCH_SIZE = 10000;

// Static pages that don't need DB queries
const STATIC_PAGES = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/players", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/teams", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/organisations", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/leaderboards", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/competitions", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/grades", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/grades/compare", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/rising-stars", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/compare", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/search", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/heatmap", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/games", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/glossary", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/analytics", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/analytics/per", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/analytics/draft-board", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/analytics/season-recap", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/analytics/win-probability", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/all-stars", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/awards", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/rankings", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/predictions", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/conferences", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/anomalies", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/clutch", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/draft", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/fantasy", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/fouls", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/hall-of-fame", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/matchup", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/timeline", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/scouting", changeFrequency: "weekly" as const, priority: 0.6 },
];

// Generate sitemap index — each segment handles a batch
export async function generateSitemaps() {
  const [playerCount, teamCount, orgCount, gradeCount, gameCount] =
    await Promise.all(
      ["players", "teams", "organisations", "grades", "games"].map(
        async (table) => {
          const { count } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true });
          return count || 0;
        }
      )
    );

  const sitemaps: { id: number }[] = [];
  let idx = 0;

  // id 0 = static pages
  sitemaps.push({ id: idx++ });

  // Players: ids 1..N
  const playerBatches = Math.ceil(playerCount / BATCH_SIZE);
  for (let i = 0; i < playerBatches; i++) sitemaps.push({ id: idx++ });

  // Teams
  const teamBatches = Math.ceil(teamCount / BATCH_SIZE);
  for (let i = 0; i < teamBatches; i++) sitemaps.push({ id: idx++ });

  // Orgs
  const orgBatches = Math.ceil(orgCount / BATCH_SIZE);
  for (let i = 0; i < orgBatches; i++) sitemaps.push({ id: idx++ });

  // Grades
  const gradeBatches = Math.ceil(gradeCount / BATCH_SIZE);
  for (let i = 0; i < gradeBatches; i++) sitemaps.push({ id: idx++ });

  // Games
  const gameBatches = Math.ceil(gameCount / BATCH_SIZE);
  for (let i = 0; i < gameBatches; i++) sitemaps.push({ id: idx++ });

  return sitemaps;
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  // Compute batch ranges same way as generateSitemaps
  const [playerCount, teamCount, orgCount, gradeCount] = await Promise.all(
    ["players", "teams", "organisations", "grades"].map(async (table) => {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });
      return count || 0;
    })
  );

  const playerBatches = Math.ceil(playerCount / BATCH_SIZE);
  const teamBatches = Math.ceil(teamCount / BATCH_SIZE);
  const orgBatches = Math.ceil(orgCount / BATCH_SIZE);
  const gradeBatches = Math.ceil(gradeCount / BATCH_SIZE);

  let cursor = 0;

  // id 0 = static pages
  if (id === cursor) {
    return STATIC_PAGES.map((p) => ({
      url: `${BASE}${p.path}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    }));
  }
  cursor++;

  // Players
  if (id < cursor + playerBatches) {
    const batchIdx = id - cursor;
    return await fetchBatch("players", "/players", batchIdx, 0.6);
  }
  cursor += playerBatches;

  // Teams
  if (id < cursor + teamBatches) {
    const batchIdx = id - cursor;
    return await fetchBatch("teams", "/teams", batchIdx, 0.6);
  }
  cursor += teamBatches;

  // Orgs
  if (id < cursor + orgBatches) {
    const batchIdx = id - cursor;
    return await fetchBatch("organisations", "/organisations", batchIdx, 0.7);
  }
  cursor += orgBatches;

  // Grades
  if (id < cursor + gradeBatches) {
    const batchIdx = id - cursor;
    return await fetchBatch("grades", "/grades", batchIdx, 0.6);
  }
  cursor += gradeBatches;

  // Games (remaining ids)
  const batchIdx = id - cursor;
  return await fetchBatch("games", "/games", batchIdx, 0.4);
}

async function fetchBatch(
  table: string,
  prefix: string,
  batchIdx: number,
  priority: number
): Promise<MetadataRoute.Sitemap> {
  const from = batchIdx * BATCH_SIZE;
  const { data } = await supabase
    .from(table)
    .select("id")
    .range(from, from + BATCH_SIZE - 1);

  if (!data) return [];

  return data.map((r: { id: string }) => ({
    url: `${BASE}${prefix}/${r.id}`,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
