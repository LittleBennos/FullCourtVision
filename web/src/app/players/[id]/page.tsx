import { getPlayerDetails, getAvailableSeasons } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { PlayerTrendsChart } from "@/components/player-trends-chart";
import { Users, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const playerData = await getPlayerDetails(params.id);
  
  if (!playerData) {
    return {
      title: "Player Not Found — FullCourtVision",
    };
  }

  const { player } = playerData;
  return {
    title: `${player.first_name} ${player.last_name} — FullCourtVision`,
    description: `Basketball statistics for ${player.first_name} ${player.last_name}`,
  };
}

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const playerData = await getPlayerDetails(params.id);

  if (!playerData) {
    notFound();
  }

  const { player, stats } = playerData;
  const seasons = await getAvailableSeasons();

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Player Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {player.first_name} {player.last_name}
        </h1>
        <p className="text-muted-foreground">
          Basketball player across {stats.length} competition{stats.length !== 1 ? 's' : ''}
        </p>
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

      {/* Performance Trends Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Performance Trends</h2>
        <PlayerTrendsChart 
          playerStats={stats} 
          seasons={seasons}
          playerId={params.id}
        />
      </div>

      {/* Season Breakdown Table */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-xl font-semibold mb-4">Season Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Competition</th>
                <th className="text-left py-3 px-4">Season</th>
                <th className="text-left py-3 px-4">Grade</th>
                <th className="text-left py-3 px-4">Team</th>
                <th className="text-center py-3 px-4">GP</th>
                <th className="text-center py-3 px-4">PTS</th>
                <th className="text-center py-3 px-4">PPG</th>
                <th className="text-center py-3 px-4">2PM</th>
                <th className="text-center py-3 px-4">3PM</th>
                <th className="text-center py-3 px-4">FOULS</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.id} className="border-b border-border/50">
                  <td className="py-3 px-4">{stat.competition_name || '-'}</td>
                  <td className="py-3 px-4">{stat.season_name || '-'}</td>
                  <td className="py-3 px-4">{stat.grade_name || '-'}</td>
                  <td className="py-3 px-4">{stat.team_name || '-'}</td>
                  <td className="text-center py-3 px-4">{stat.games_played || 0}</td>
                  <td className="text-center py-3 px-4">{stat.total_points || 0}</td>
                  <td className="text-center py-3 px-4">
                    {stat.games_played > 0 
                      ? ((stat.total_points || 0) / stat.games_played).toFixed(1)
                      : '0.0'
                    }
                  </td>
                  <td className="text-center py-3 px-4">{stat.two_point || 0}</td>
                  <td className="text-center py-3 px-4">{stat.three_point || 0}</td>
                  <td className="text-center py-3 px-4">{stat.total_fouls || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No statistics available for this player.
          </p>
        )}
      </div>
    </div>
  );
}