import { getOrganisationById, getOrganisationAnalytics } from "@/lib/data";
import { OrgAnalyticsClient } from "./org-analytics-client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await getOrganisationById(id);
  if (!org) return { title: "Organisation Not Found — FullCourtVision" };

  return {
    title: `${org.name} Analytics`,
    description: `Analytics dashboard for ${org.name} — team performance, top scorers, and season trends.`,
  };
}

export default async function OrgAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, analytics] = await Promise.all([
    getOrganisationById(id),
    getOrganisationAnalytics(id),
  ]);

  if (!org) notFound();

  return <OrgAnalyticsClient organisation={org} analytics={analytics} />;
}
