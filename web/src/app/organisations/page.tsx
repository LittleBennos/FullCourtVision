import { getOrganisations } from "@/lib/data";
import { OrganisationsClient } from "./organisations-client";

export const metadata = {
  title: "Organisations",
  description: "Browse all basketball organisations across Victoria, Australia. View teams, players, and club statistics.",
};

export const dynamic = "force-dynamic";

export default async function OrganisationsPage() {
  const organisations = await getOrganisations();
  return <OrganisationsClient organisations={organisations} />;
}