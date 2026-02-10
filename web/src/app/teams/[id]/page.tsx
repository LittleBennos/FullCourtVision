import { getTeamById, getTeamPlayers } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, CalendarDays, Sparkles, History, BarChart3, ClipboardList } from "lucide-react";
import { HeadToHeadSelector } from "@/components/head-to-head-selector";
import { FavouriteButton } from "@/components/favourite-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TeamShareButton } from "@/components/team-share-button";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeamById(id);
  if (!team) return { title: "Team Not Found — FullCourtVision" };

  const desc = `${team.name} from ${team.org_name}. ${team.wins}W-${team.losses}L across ${team.games_played} games in Victorian basketball.`;
  return {
    title: `${team.name} — ${team.org_name}`,
    description: desc,
    openGraph: {
      title: `${team.name} | FullCourtVision`,
      description: desc,
      type: "website",
    },
    twitter: { card: "summary_large_image" as const, title: `${team.name} | FullCourtVision`, description: desc },
  };
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [team, players] = await Promise.all([
    getTeamById(id),
    getTeamPlayers(id),
  ]);
  if (!team) notFound();

  const totalPoints = players.reduce((s, p) => s + p.total_points, 0);
  const totalGames = team.games_played;
  const avgPPG = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";
  const winPct = totalGames > 0 ? ((team.wins / totalGames) * 100).toFixed(0) : "-";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Teams", href: "/teams" },
        { label: team.name },
      ]} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsTeam",
            name: team.name,
            url: `https://fullcourtvision.vercel.app/teams/${id}`,
            sport: "Basketball",
            memberOf: team.org_name ? { "@type": "SportsOrganization", name: team.org_name } : undefined,
          }),
        }}
      />
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{team.name}</h1>
              <FavouriteButton id={id} type="team" />
              <TeamShareButton
                name={team.name}
                orgName={team.org_name || "Unknown"}
                seasonName={team.season_name || "Unknown Season"}
                wins={team.wins}
                losses={team.losses}
                games={totalGames}
                totalPoints={totalPoints}
                avgPPG={avgPPG}
              />
            </div>
            <p className="text-muted-foreground mb-1">
              {team.org_name ? (
                <Link href={`/organisations/${team.organisation_id}`} className="text-accent hover:underline">
                  {team.org_name}
                </Link>
              ) : "Unknown Organisation"}
              {" · "}{team.season_name || "Unknown Season"}
            </p>
          </div>
          <div>
            <HeadToHeadSelector teamId={id} teamName={team.name} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-green-400">{team.wins}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-red-400">{team.losses}</p>
            <p className="text-sm text-muted-foreground">Losses</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold">{totalGames}</p>
            <p className="text-sm text-muted-foreground">Games</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold">{winPct}{winPct !== "-" ? "%" : ""}</p>
            <p className="text-sm text-muted-foreground">Win %</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">{totalPoints.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">{avgPPG}</p>
            <p className="text-sm text-muted-foreground">Team PPG</p>
          </div>
        </div>
      </div>

      {/* Schedule Link */}
      <Link
        href={`/teams/${id}/schedule`}
        className="flex items-center gap-3 bg-card rounded-xl border border-border p-5 mb-8 hover:bg-accent/5 transition-colors group"
      >
        <CalendarDays className="w-5 h-5 text-accent" />
        <span className="font-medium group-hover:text-accent transition-colors">View Full Schedule &amp; Results</span>
        <span className="ml-auto text-muted-foreground text-sm">→</span>
      </Link>

      {/* Analytics Link */}
      <Link
        href={`/teams/${id}/analytics`}
        className="flex items-center gap-3 bg-card rounded-xl border border-border p-5 mb-8 hover:bg-accent/5 transition-colors group"
      >
        <BarChart3 className="w-5 h-5 text-accent" />
        <span className="font-medium group-hover:text-accent transition-colors">Advanced Analytics Dashboard</span>
        <span className="ml-auto text-muted-foreground text-sm">→</span>
      </Link>

      {/* Chemistry Link */}
      <Link
        href={`/teams/${id}/chemistry`}
        className="flex items-center gap-3 bg-card rounded-xl border border-border p-5 mb-8 hover:bg-accent/5 transition-colors group"
      >
        <Sparkles className="w-5 h-5 text-accent" />
        <span className="font-medium group-hover:text-accent transition-colors">Team Chemistry Analysis</span>
        <span className="ml-auto text-muted-foreground text-sm">→</span>
      </Link>

      {/* Roster History Link */}
      <Link
        href={`/teams/${id}/history`}
        className="flex items-center gap-3 bg-card rounded-xl border border-border p-5 mb-8 hover:bg-accent/5 transition-colors group"
      >
        <History className="w-5 h-5 text-accent" />
        <span className="font-medium group-hover:text-accent transition-colors">Roster History</span>
        <span className="ml-auto text-muted-foreground text-sm">→</span>
      </Link>

      {/* Game Plan Link - requires selecting an opponent via head-to-head */}
      <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-5 mb-8">
        <ClipboardList className="w-5 h-5 text-accent" />
        <div>
          <span className="font-medium">Coach&apos;s Game Plan</span>
          <p className="text-xs text-muted-foreground">Select an opponent via Head-to-Head above to generate a scouting report</p>
        </div>
      </div>

      {/* Roster */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Player Roster</h2>
          <span className="text-sm text-muted-foreground">({players.length} players)</span>
        </div>

        {players.length === 0 ? (
          <p className="text-muted-foreground text-sm">No player data available for this team.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Player</th>
                  <th className="text-right px-4 py-3 font-medium">GP</th>
                  <th className="text-right px-4 py-3 font-medium">PTS</th>
                  <th className="text-right px-4 py-3 font-medium">PPG</th>
                  <th className="text-right px-4 py-3 font-medium">1PT</th>
                  <th className="text-right px-4 py-3 font-medium">2PT</th>
                  <th className="text-right px-4 py-3 font-medium">3PT</th>
                  <th className="text-right px-4 py-3 font-medium">Fouls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FavouriteButton id={p.id} type="player" />
                        <Link href={`/players/${p.id}`} className="text-accent hover:underline font-medium">
                          {p.first_name} {p.last_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.games_played}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.total_points}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent">{p.ppg}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.one_point}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.two_point}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.three_point}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.total_fouls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
