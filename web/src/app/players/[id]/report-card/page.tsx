import { Metadata } from "next";
import { getPlayerDetails } from "@/lib/data";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReportCardClient } from "@/components/report-card-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);
  if (!playerData) return { title: "Player Not Found" };
  const name = `${playerData.player.first_name} ${playerData.player.last_name}`;
  return {
    title: `${name} Report Card`,
    description: `Development report card for ${name} — grades, percentile rankings, and growth analysis.`,
  };
}

export const revalidate = 3600;

export default async function ReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);
  if (!playerData) notFound();

  const playerName = `${playerData.player.first_name} ${playerData.player.last_name}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Players", href: "/players" },
        { label: playerName, href: `/players/${id}` },
        { label: "Report Card" },
      ]} />
      <ReportCardClient playerId={id} playerName={playerName} />
    </div>
  );
}
