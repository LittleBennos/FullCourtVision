import { getTeamById, getHeadToHeadData } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Calendar, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string; opponentId: string }> }): Promise<Metadata> {
  const { id, opponentId } = await params;
  const [team1, team2] = await Promise.all([
    getTeamById(id),
    getTeamById(opponentId),
  ]);
  
  if (!team1 || !team2) return { title: "Head to Head Not Found — FullCourtVision" };

  const title = `${team1.name} vs ${team2.name} — Head to Head`;
  const description = `Head-to-head comparison between ${team1.name} and ${team2.name} in Victorian basketball. View historical record, recent games, and key player comparisons.`;
  
  return {
    title,
    description,
    openGraph: {
      title: `${team1.name} vs ${team2.name} | FullCourtVision`,
      description,
      type: "website",
    },
    twitter: { 
      card: "summary_large_image" as const, 
      title: `${team1.name} vs ${team2.name} | FullCourtVision`, 
      description 
    },
  };
}

export default async function HeadToHeadPage({ params }: { params: Promise<{ id: string; opponentId: string }> }) {
  const { id, opponentId } = await params;
  const [team1, team2, headToHeadData] = await Promise.all([
    getTeamById(id),
    getTeamById(opponentId),
    getHeadToHeadData(id, opponentId),
  ]);

  if (!team1 || !team2 || !headToHeadData) notFound();

  const winPercentageTeam1 = headToHeadData.record.total_games > 0 
    ? ((headToHeadData.record.team1_wins / headToHeadData.record.total_games) * 100).toFixed(0)
    : "0";
    
  const winPercentageTeam2 = headToHeadData.record.total_games > 0 
    ? ((headToHeadData.record.team2_wins / headToHeadData.record.total_games) * 100).toFixed(0)
    : "0";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getDifferentialIcon = (differential: number) => {
    if (differential > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (differential < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href={`/teams/${id}`} className="inline-flex items-center gap-1 text-accent hover:underline text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to {team1.name}
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Head to Head</h1>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href={`/teams/${team1.id}`} className="text-xl md:text-2xl font-semibold text-accent hover:underline">
              {team1.name}
            </Link>
            <span className="text-muted-foreground text-lg">vs</span>
            <Link href={`/teams/${team2.id}`} className="text-xl md:text-2xl font-semibold text-accent hover:underline">
              {team2.name}
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-4 text-sm text-muted-foreground flex-wrap">
            <span>{team1.org_name}</span>
            <span>•</span>
            <span>{team2.org_name}</span>
          </div>
        </div>

        {/* Overall Record */}
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-green-400">{headToHeadData.record.team1_wins}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
            <p className="text-xs text-muted-foreground">{winPercentageTeam1}%</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-muted-foreground">{headToHeadData.record.total_games}</p>
            <p className="text-sm text-muted-foreground">Games</p>
            <p className="text-xs text-muted-foreground">Played</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-green-400">{headToHeadData.record.team2_wins}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
            <p className="text-xs text-muted-foreground">{winPercentageTeam2}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Games */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Last 5 Meetings</h2>
          </div>
          
          {headToHeadData.recent_games.length === 0 ? (
            <p className="text-muted-foreground text-sm">No games found between these teams.</p>
          ) : (
            <div className="space-y-3">
              {headToHeadData.recent_games.map((game) => (
                <div key={game.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{formatDate(game.date)}</span>
                    <span className="text-xs text-muted-foreground">{game.season_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${game.team1_home ? 'font-semibold' : ''}`}>
                        {team1.name} {game.team1_home ? '(H)' : '(A)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold">
                      <span className={game.team1_score > game.team2_score ? 'text-green-400' : 'text-red-400'}>
                        {game.team1_score}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={game.team2_score > game.team1_score ? 'text-green-400' : 'text-red-400'}>
                        {game.team2_score}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!game.team1_home ? 'font-semibold' : ''}`}>
                        {team2.name} {!game.team1_home ? '(H)' : '(A)'}
                      </span>
                    </div>
                  </div>
                  {game.venue && (
                    <p className="text-xs text-muted-foreground mt-1">{game.venue}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Average Score Differential */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            {getDifferentialIcon(headToHeadData.average_differential.differential)}
            <h2 className="text-lg font-semibold">Average Scores</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{team1.name}</span>
              <span className="text-xl font-bold text-accent">{headToHeadData.average_differential.team1_avg}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{team2.name}</span>
              <span className="text-xl font-bold text-accent">{headToHeadData.average_differential.team2_avg}</span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Differential</span>
                <span className={`text-xl font-bold ${
                  headToHeadData.average_differential.differential > 0 
                    ? 'text-green-400' 
                    : headToHeadData.average_differential.differential < 0 
                      ? 'text-red-400' 
                      : 'text-muted-foreground'
                }`}>
                  {headToHeadData.average_differential.differential > 0 ? '+' : ''}
                  {headToHeadData.average_differential.differential}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.abs(headToHeadData.average_differential.differential)} point advantage to{' '}
                {headToHeadData.average_differential.differential > 0 ? team1.name : team2.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Player Comparisons */}
      <div className="bg-card rounded-xl border border-border p-6 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Top Scorers Comparison</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team 1 Top Scorers */}
          <div>
            <h3 className="font-semibold mb-4 text-center">{team1.name}</h3>
            {headToHeadData.player_comparison.team1_top_scorers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">No player data available</p>
            ) : (
              <div className="space-y-3">
                {headToHeadData.player_comparison.team1_top_scorers.map((player, index) => (
                  <div key={player.player_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-accent">#{index + 1}</span>
                      <div>
                        <Link href={`/players/${player.player_id}`} className="font-medium text-accent hover:underline">
                          {player.first_name} {player.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{player.games_played} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{player.total_points} pts</p>
                      <p className="text-xs text-muted-foreground">{player.ppg} ppg</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team 2 Top Scorers */}
          <div>
            <h3 className="font-semibold mb-4 text-center">{team2.name}</h3>
            {headToHeadData.player_comparison.team2_top_scorers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">No player data available</p>
            ) : (
              <div className="space-y-3">
                {headToHeadData.player_comparison.team2_top_scorers.map((player, index) => (
                  <div key={player.player_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-accent">#{index + 1}</span>
                      <div>
                        <Link href={`/players/${player.player_id}`} className="font-medium text-accent hover:underline">
                          {player.first_name} {player.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{player.games_played} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{player.total_points} pts</p>
                      <p className="text-xs text-muted-foreground">{player.ppg} ppg</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}