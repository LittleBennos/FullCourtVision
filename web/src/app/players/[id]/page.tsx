import { getPlayerDetails, getAvailableSeasons, getSimilarPlayers } from "@/lib/data";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { Users, TrendingUp, Target, AlertTriangle, ClipboardList, Crosshair } from "lucide-react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { ArchetypeBadge } from "@/components/archetype-badge";
import { AnomalyBadges } from "@/components/anomaly-badges";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlayerShareButton } from "@/components/player-share-button";
import { PlayerAvailability } from "@/components/player-availability";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { PlayerFoulCard } from "@/components/player-foul-card";
import { PERBadge } from "@/components/per-badge";

// Dynamically import chart components to reduce initial bundle size
const SeasonProgressionChart = dynamic(() => import("@/components/season-progression-chart").then(mod => ({ default: mod.SeasonProgressionChart })), {
  loading: () => (
    <div className="h-80 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <p>Loading season progression...</p>
      </div>
    </div>
  )
});

const MultiSeasonComparison = dynamic(() => import("@/components/multi-season-comparison").then(mod => ({ default: mod.MultiSeasonComparison })), {
  loading: () => (
    <div className="h-64 bg-slate-950 rounded-xl border border-amber-500/20 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-amber-500/50 border-t-transparent rounded-full animate-spin" />
        <p>Loading multi-season comparison...</p>
      </div>
    </div>
  )
});

const PlayerTrendsChart = dynamic(() => import("@/components/player-trends-chart").then(mod => ({ default: mod.PlayerTrendsChart })), {
  loading: () => (
    <div className="h-80 bg-card rounded-xl border border-border flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        <p>Loading performance trends...</p>
      </div>
    </div>
  )
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);
  
  if (!playerData) {
    return { title: "Player Not Found" };
  }

  const { player, stats } = playerData;
  const totalGames = stats.reduce((s, st) => s + (st.games_played || 0), 0);
  const totalPoints = stats.reduce((s, st) => s + (st.total_points || 0), 0);
  const ppg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";
  const name = `${player.first_name} ${player.last_name}`;
  const desc = `${name} basketball stats: ${totalGames} games, ${totalPoints} points, ${ppg} PPG across ${stats.length} competition${stats.length !== 1 ? "s" : ""} in Victoria.`;

  return {
    title: `${name} Stats`,
    description: desc,
    openGraph: {
      title: `${name} Stats | FullCourtVision`,
      description: desc,
      type: "profile",
      images: [`/api/og?type=player&name=${encodeURIComponent(name)}&ppg=${ppg}&games=${totalGames}`],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${name} Stats | FullCourtVision`,
      description: desc,
    },
  };
}

export const revalidate = 3600; // 1 hour - player stats don't change frequently

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerData = await getPlayerDetails(id);

  if (!playerData) {
    notFound();
  }

  const { player, stats } = playerData;
  const [seasons, similarPlayers] = await Promise.all([
    getAvailableSeasons(),
    getSimilarPlayers(id),
  ]);

  // Calculate total stats across all seasons
  const totalStats = stats.reduce(
    (acc, stat) => ({
      games: acc.games + (stat.games_played || 0),
      points: acc.points + (stat.total_points || 0),
      twoPoint: acc.twoPoint + (stat.two_point || 0),
      threePoint: acc.threePoint + (stat.three_point || 0),
      fouls: acc.fouls + (stat.total_fouls || 0),
    }),
    { games: 0, points: 0, twoPoint: 0, threePoint: 0, fouls: 0 }
  );

  const averages = {
    ppg: totalStats.games > 0 ? +(totalStats.points / totalStats.games).toFixed(1) : 0,
    twoPtPg: totalStats.games > 0 ? +(totalStats.twoPoint / totalStats.games).toFixed(1) : 0,
    threePtPg: totalStats.games > 0 ? +(totalStats.threePoint / totalStats.games).toFixed(1) : 0,
    foulsPg: totalStats.games > 0 ? +(totalStats.fouls / totalStats.games).toFixed(1) : 0,
  };

  const playerName = `${player.first_name} ${player.last_name}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: playerName,
            url: `https://fullcourtvision.vercel.app/players/${id}`,
            description: `Basketball player with ${totalStats.games} games and ${totalStats.points} total points across Victorian basketball.`,
            sport: "Basketball",
          }),
        }}
      />
      <Breadcrumbs items={[
        { label: "Players", href: "/players" },
        { label: playerName },
      ]} />

      {/* Player Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-4xl font-bold">
            {player.first_name} {player.last_name}
          </h1>
          <div className="flex items-center gap-3">
          <Link
            href={`/scouting/${id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm font-medium"
          >
            <Crosshair className="w-4 h-4" />
            Scouting Report
          </Link>
          <Link
            href={`/players/${id}/report-card`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm font-medium"
          >
            <ClipboardList className="w-4 h-4" />
            Report Card
          </Link>
          <PlayerShareButton
            name={playerName}
            games={totalStats.games}
            ppg={averages.ppg}
            totalPoints={totalStats.points}
            totalFouls={totalStats.fouls}
            threePtPg={averages.threePtPg}
            twoPtPg={averages.twoPtPg}
            foulsPg={averages.foulsPg}
            competitions={stats.length}
          />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-muted-foreground">
            Basketball player across {stats.length} competition{stats.length !== 1 ? 's' : ''}
          </p>
          {totalStats.games >= 3 && (
            <ArchetypeBadge
              ppg={averages.ppg}
              threePtPg={averages.threePtPg}
              twoPtPg={averages.twoPtPg}
              foulsPg={averages.foulsPg}
            />
          )}
        </div>
        <div className="mt-2">
          <PERBadge playerId={id} />
        </div>
        <AnomalyBadges playerId={id} />
      </div>

      {/* Career Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Games Played"
          value={totalStats.games}
          icon={Users}
        />
        <StatCard
          label="Points Per Game"
          value={averages.ppg}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Points"
          value={totalStats.points}
          icon={Target}
        />
        <StatCard
          label="Total Fouls"
          value={totalStats.fouls}
          icon={AlertTriangle}
        />
      </div>

      {/* Foul Profile Card */}
      {totalStats.games >= 3 && (
        <div className="mb-8">
          <PlayerFoulCard
            totalFouls={totalStats.fouls}
            totalGames={totalStats.games}
            foulsPg={averages.foulsPg}
            stats={stats.map(s => ({ games_played: s.games_played || 0, total_fouls: s.total_fouls || 0 }))}
          />
        </div>
      )}

      {/* Multi-Season Comparison */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Multi-Season Comparison</h2>
        <MultiSeasonComparison playerId={id} />
      </div>

      {/* Season Progression Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Season Progression</h2>
        <SeasonProgressionChart playerId={id} />
      </div>

      {/* Performance Trends Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Performance Trends</h2>
        <PlayerTrendsChart 
          playerStats={stats} 
          seasons={seasons}
          playerId={id}
        />
      </div>

      {/* Availability Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Availability</h2>
        <PlayerAvailability playerId={id} />
      </div>

      {/* Career Milestones */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Career Milestones</h2>
        <MilestoneTimeline playerId={id} />
      </div>

      {/* Season Breakdown Table */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-xl font-semibold mb-4">Season Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={`${playerName} season by season statistics`}>
            <caption className="sr-only">
              Detailed statistics for {playerName} broken down by season, competition, and team
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4" scope="col">Competition</th>
                <th className="text-left py-3 px-4" scope="col">Season</th>
                <th className="text-left py-3 px-4" scope="col">Grade</th>
                <th className="text-left py-3 px-4" scope="col">Team</th>
                <th className="text-center py-3 px-4" scope="col" aria-label="Games Played">GP</th>
                <th className="text-center py-3 px-4" scope="col" aria-label="Total Points">PTS</th>
                <th className="text-center py-3 px-4" scope="col" aria-label="Points Per Game">PPG</th>
                <th className="text-center py-3 px-4" scope="col" aria-label="Two Point Makes">2PM</th>
                <th className="text-center py-3 px-4" scope="col" aria-label="Three Point Makes">3PM</th>
                <th className="text-center py-3 px-4" scope="col">FOULS</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, _index) => (
                <tr key={stat.id} className="border-b border-border/50">
                  <th className="py-3 px-4 text-left font-normal" scope="row">
                    {stat.competition_name || '-'}
                  </th>
                  <td className="py-3 px-4">{stat.season_name || '-'}</td>
                  <td className="py-3 px-4">{stat.grade_name || '-'}</td>
                  <td className="py-3 px-4">{stat.team_name || '-'}</td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.games_played || 0} games played`}>
                    {stat.games_played || 0}
                  </td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.total_points || 0} total points`}>
                    {stat.total_points || 0}
                  </td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.games_played > 0 ? ((stat.total_points || 0) / stat.games_played).toFixed(1) : '0.0'} points per game`}>
                    {stat.games_played > 0 
                      ? ((stat.total_points || 0) / stat.games_played).toFixed(1)
                      : '0.0'
                    }
                  </td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.two_point || 0} two point makes`}>
                    {stat.two_point || 0}
                  </td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.three_point || 0} three point makes`}>
                    {stat.three_point || 0}
                  </td>
                  <td className="text-center py-3 px-4" aria-label={`${stat.total_fouls || 0} total fouls`}>
                    {stat.total_fouls || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.length === 0 && (
          <p className="text-muted-foreground text-center py-8" role="status">
            No statistics available for this player.
          </p>
        )}
      </div>

      {/* Similar Players */}
      {similarPlayers.length > 0 && (
        <div className="mt-8 bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Similar Players
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Based on cosine similarity of per-game stats (PPG, fouls, 2PT, 3PT)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {similarPlayers.map((sp) => (
              <Link
                key={sp.id}
                href={`/players/${sp.id}`}
                className="group block rounded-lg border border-border bg-slate-950 p-4 transition-all hover:border-blue-400/50 hover:bg-slate-900"
              >
                <div className="font-semibold text-sm group-hover:text-blue-400 transition-colors truncate">
                  {sp.first_name} {sp.last_name}
                </div>
                <div className="mt-2 text-2xl font-bold text-blue-400">
                  {sp.similarity}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">similarity</div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>PPG: <span className="text-foreground">{sp.ppg}</span></span>
                  <span>FPG: <span className="text-foreground">{sp.foulsPg}</span></span>
                  <span>2PT: <span className="text-foreground">{sp.twoPtPg}</span></span>
                  <span>3PT: <span className="text-foreground">{sp.threePtPg}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}