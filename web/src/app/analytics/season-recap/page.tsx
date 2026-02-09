import { getAvailableSeasons } from "@/lib/data";
import { SeasonRecapClient } from "./season-recap-client";

export const metadata = {
  title: "Season Recap | FullCourtVision",
  description:
    "Season in review — top scorers, most improved players, record-breaking games, biggest blowouts, most consistent players, and award winners across Victorian basketball.",
  openGraph: {
    title: "Season Recap | FullCourtVision",
    description:
      "The ultimate season recap — top scorers, awards, record games, biggest upsets, and more.",
    type: "website",
    url: "https://fullcourtvision.com/analytics/season-recap",
    images: [{ url: "/og-season-recap.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Season Recap | FullCourtVision",
    description:
      "The ultimate season recap — top scorers, awards, record games, biggest upsets, and more.",
  },
};

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ season?: string }>;
};

export default async function SeasonRecapPage({ searchParams }: Props) {
  const { season } = await searchParams;
  const seasons = await getAvailableSeasons();
  const seasonList = seasons.map((s) => ({ id: s.id, name: s.name }));

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏀 Season Recap</h1>
        <p className="text-muted-foreground">
          A comprehensive look back at the season — top performers, record-breaking moments, and award winners.
        </p>
      </div>
      <SeasonRecapClient seasons={seasonList} initialSeason={season} />
    </main>
  );
}
