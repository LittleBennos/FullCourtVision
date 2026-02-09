import Link from "next/link";
import { Calendar, Trophy, Target, TrendingUp, Users, Timer, BarChart3, Percent } from "lucide-react";
import { RecentGame, FeaturedGame, WeeklyNumbers } from "@/lib/data";
import { MarginDistributionChart, DailyGamesChart } from "@/components/charts-optimized";

function formatGameDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-AU', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function GameCard({ game }: { game: RecentGame }) {
  const winnerScore = Math.max(game.home_score, game.away_score);
  const loserScore = Math.min(game.home_score, game.away_score);
  const homeWon = game.home_score > game.away_score;

  return (
    <Link 
      href={`/games/${game.id}`}
      className="group block bg-card hover:bg-muted/50 rounded-lg border border-border p-4 transition-all hover:border-accent/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Teams and Score */}
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <div className={`font-medium ${homeWon ? 'text-foreground' : 'text-muted-foreground'}`}>
                {game.home_team_name} {game.home_score}
              </div>
              <div className={`font-medium ${!homeWon ? 'text-foreground' : 'text-muted-foreground'}`}>
                {game.away_team_name} {game.away_score}
              </div>
            </div>
            
            {/* Close Game Badge */}
            {game.is_close_game && (
              <div className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-full font-medium">
                <Target className="w-3 h-3 inline mr-1" />
                Close Game
              </div>
            )}
          </div>
          
          {/* Game Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatGameDate(game.date)}
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {game.grade_name}
            </div>
            <div className="truncate">
              {game.competition_name}
            </div>
          </div>
        </div>

        {/* Margin */}
        <div className="ml-4 text-right">
          <div className="text-lg font-bold text-foreground">
            {winnerScore}
          </div>
          <div className="text-sm text-muted-foreground">
            {loserScore}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {game.margin}pt margin
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturedGameCard({ game, title }: { game: FeaturedGame; title: string }) {
  const homeWon = game.home_score > game.away_score;
  
  const IconComponent = game.type === 'close' ? Target : TrendingUp;
  const bgColor = game.type === 'close' ? 'bg-blue-500/10' : 'bg-orange-500/10';
  const textColor = game.type === 'close' ? 'text-blue-600' : 'text-orange-600';

  return (
    <Link 
      href={`/games/${game.id}`}
      className={`group block ${bgColor} hover:bg-opacity-75 rounded-xl border-2 border-dashed ${game.type === 'close' ? 'border-blue-300' : 'border-orange-300'} p-6 transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`inline-flex items-center gap-2 ${textColor} font-medium mb-2`}>
            <IconComponent className="w-4 h-4" />
            {title}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatGameDate(game.date)} • {game.grade_name}
          </div>
        </div>
        <div className={`text-2xl font-bold ${textColor}`}>
          {game.margin}pts
        </div>
      </div>

      <div className="space-y-1">
        <div className={`text-lg font-semibold ${homeWon ? 'text-foreground' : 'text-muted-foreground'}`}>
          {game.home_team_name} {game.home_score}
        </div>
        <div className={`text-lg font-semibold ${!homeWon ? 'text-foreground' : 'text-muted-foreground'}`}>
          {game.away_team_name} {game.away_score}
        </div>
      </div>
    </Link>
  );
}

function buildMarginDistribution(games: RecentGame[]): { range: string; count: number }[] {
  const buckets: Record<string, number> = {
    '1-5': 0,
    '6-10': 0,
    '11-20': 0,
    '21-30': 0,
    '31+': 0,
  };

  for (const game of games) {
    const m = game.margin;
    if (m <= 5) buckets['1-5']++;
    else if (m <= 10) buckets['6-10']++;
    else if (m <= 20) buckets['11-20']++;
    else if (m <= 30) buckets['21-30']++;
    else buckets['31+']++;
  }

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

function WeeklyNumbersCard({ numbers }: { numbers: WeeklyNumbers }) {
  return (
    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6 space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-accent">
        <Timer className="w-5 h-5" />
        This Week in Numbers
      </h3>
      
      {/* Key stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-accent/10">
          <span className="text-muted-foreground">Games Played</span>
          <span className="text-xl font-bold text-foreground">{numbers.total_games}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-accent/10">
          <span className="text-muted-foreground">Total Points</span>
          <span className="text-xl font-bold text-foreground">{numbers.total_points.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-accent/10">
          <span className="text-muted-foreground flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Avg Margin
          </span>
          <span className="text-xl font-bold text-foreground">{numbers.avg_margin}pts</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-accent/10">
          <span className="text-muted-foreground flex items-center gap-1">
            <Percent className="w-3 h-3" /> Close Games
          </span>
          <span className="text-xl font-bold text-foreground">{numbers.close_game_pct}%</span>
        </div>
        
        {numbers.highest_scorer && (
          <div className="pt-2">
            <div className="text-sm text-muted-foreground mb-1">Top Scorer This Week</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">{numbers.highest_scorer.player_name}</div>
                <div className="text-sm text-muted-foreground">{numbers.highest_scorer.team_name}</div>
              </div>
              <div className="text-xl font-bold text-accent">{numbers.highest_scorer.points}pts</div>
            </div>
          </div>
        )}
      </div>

      {/* Daily games chart */}
      {numbers.daily_breakdown.some(d => d.games > 0) && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Games Per Day</h4>
          <DailyGamesChart data={numbers.daily_breakdown} />
        </div>
      )}
    </div>
  );
}

interface RecentActivityProps {
  games: RecentGame[];
  featuredGames: { closest: FeaturedGame | null; blowout: FeaturedGame | null };
  weeklyNumbers: WeeklyNumbers;
}

export function RecentActivity({ games, featuredGames, weeklyNumbers }: RecentActivityProps) {
  const marginData = buildMarginDistribution(games);

  return (
    <section className="max-w-7xl mx-auto px-4 mb-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Recent Activity</h2>
        <p className="text-muted-foreground">
          Latest games and highlights from across Victorian basketball
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content - Games Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Featured Games */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Game Highlights
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {featuredGames.closest && (
                <FeaturedGameCard 
                  game={featuredGames.closest} 
                  title="Closest Game This Week" 
                />
              )}
              {featuredGames.blowout && (
                <FeaturedGameCard 
                  game={featuredGames.blowout} 
                  title="Biggest Blowout This Week" 
                />
              )}
            </div>
          </div>

          {/* Margin Distribution Chart */}
          {games.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Score Margin Distribution
              </h3>
              <MarginDistributionChart data={marginData} />
            </div>
          )}

          {/* Recent Games Timeline */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Recent Games ({games.length})
            </h3>
            <div className="space-y-3">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
            
            {games.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent games found</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Weekly Numbers */}
        <div className="lg:col-span-1">
          <WeeklyNumbersCard numbers={weeklyNumbers} />
        </div>
      </div>
    </section>
  );
}
