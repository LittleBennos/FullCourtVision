import { getOrganisations } from "@/lib/data";
import { OrganisationsClient } from "./organisations-client";

export const metadata = {
  title: "Organisations — FullCourtVision",
  description: "Browse all basketball organisations across Victoria",
};

export const dynamic = "force-dynamic";

export default async function OrganisationsPage() {
  const organisations = await getOrganisations();
  return <OrganisationsClient organisations={organisations} />;
}