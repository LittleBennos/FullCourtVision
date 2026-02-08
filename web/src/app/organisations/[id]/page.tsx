import { 
  getOrganisationById, 
  getOrganisationTeams, 
  getOrganisationPlayers,
  getOrganisationStats
} from "@/lib/data";
import { OrganisationDetailClient } from "./organisation-detail-client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const organisation = await getOrganisationById(id);
  
  if (!organisation) {
    return {
      title: "Organisation Not Found — FullCourtVision",
    };
  }

  const desc = `View teams, players, and statistics for ${organisation.name}${organisation.suburb ? ` in ${organisation.suburb}, ${organisation.state}` : ""}.`;
  return {
    title: `${organisation.name}`,
    description: desc,
    openGraph: {
      title: `${organisation.name} | FullCourtVision`,
      description: desc,
      type: "website",
    },
    twitter: { card: "summary_large_image" as const, title: `${organisation.name} | FullCourtVision`, description: desc },
  };
}

export default async function OrganisationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const [organisation, teams, players, stats] = await Promise.all([
    getOrganisationById(id),
    getOrganisationTeams(id),
    getOrganisationPlayers(id),
    getOrganisationStats(id),
  ]);

  if (!organisation) {
    notFound();
  }

  return (
    <OrganisationDetailClient 
      organisation={organisation}
      teams={teams}
      players={players}
      stats={stats}
    />
  );
}