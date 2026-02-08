import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://fullcourtvision.vercel.app";

async function fetchAllIds(table: string): Promise<string[]> {
  const PAGE_SIZE = 1000;
  const ids: string[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    ids.push(...data.map((r) => r.id));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [playerIds, teamIds, orgIds, gradeIds] = await Promise.all([
    fetchAllIds("players"),
    fetchAllIds("teams"),
    fetchAllIds("organisations"),
    fetchAllIds("grades"),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/players`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/teams`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/organisations`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/leaderboards`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/competitions`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/grades`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/rising-stars`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/search`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/heatmap`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const playerPages: MetadataRoute.Sitemap = playerIds.map((id) => ({
    url: `${BASE}/players/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const teamPages: MetadataRoute.Sitemap = teamIds.map((id) => ({
    url: `${BASE}/teams/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const orgPages: MetadataRoute.Sitemap = orgIds.map((id) => ({
    url: `${BASE}/organisations/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const gradePages: MetadataRoute.Sitemap = gradeIds.map((id) => ({
    url: `${BASE}/grades/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...playerPages, ...teamPages, ...orgPages, ...gradePages];
}
