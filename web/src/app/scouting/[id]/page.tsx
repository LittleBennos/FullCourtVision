import { Metadata } from "next";
import { getPlayerDetails } from "@/lib/data";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScoutingReportClient } from "@/components/scouting-report-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);
  if (!playerData) return { title: "Player Not Found" };
  const name = `${playerData.player.first_name} ${playerData.player.last_name}`;
  return {
    title: `${name} Scouting Report`,
    description: `Coach scouting report for ${name} — percentile rankings, strengths, weaknesses, comparable players, and overall grade.`,
  };
}

export const revalidate = 3600;

export default async function ScoutingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);
  if (!playerData) notFound();

  const playerName = `${playerData.player.first_name} ${playerData.player.last_name}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Players", href: "/players" },
        { label: playerName, href: `/players/${id}` },
        { label: "Scouting Report" },
      ]} />
      <ScoutingReportClient playerId={id} playerName={playerName} />
    </div>
  );
}
