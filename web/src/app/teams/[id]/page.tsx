import { getTeamById } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeamById(id);
  if (!team) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/teams" className="inline-flex items-center gap-1 text-accent hover:underline text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
        <p className="text-muted-foreground mb-6">{team.org_name || "Unknown Organisation"} · {team.season_name || "Unknown Season"}</p>

        <div className="grid grid-cols-3 gap-6 max-w-md">
          <div>
            <p className="text-2xl font-bold text-green-400">{team.wins}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{team.losses}</p>
            <p className="text-sm text-muted-foreground">Losses</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{team.games_played}</p>
            <p className="text-sm text-muted-foreground">Games</p>
          </div>
        </div>
      </div>
    </div>
  );
}
