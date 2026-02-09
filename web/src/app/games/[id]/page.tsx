import { getGameDetails } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { Calendar, MapPin, Users, Trophy, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);
  
  if (!game) {
    return { title: "Game Not Found" };
  }

  const homeTeam = game.home_team?.name || "Unknown";
  const awayTeam = game.away_team?.name || "Unknown";
  const homeScore = game.home_score ?? "-";
  const awayScore = game.away_score ?? "-";
  const title = `${homeTeam} vs ${awayTeam} (${homeScore}-${awayScore})`;
  const desc = `Game details for ${homeTeam} vs ${awayTeam} on ${new Date(game.date).toLocaleDateString("en-AU")}. Final score: ${homeScore}-${awayScore}.`;

  return {
    title: `${title} | Game Details`,
    description: desc,
    openGraph: {
      title: `${title} | FullCourtVision`,
      description: desc,
      type: "article",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} | FullCourtVision`,
      description: desc,
    },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);

  if (!game) {
    notFound();
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getWinnerStatus = () => {
    if (game.home_score === null || game.away_score === null) {
      return { homeWin: false, awayWin: false, tie: false };
    }
    
    if (game.home_score > game.away_score) {
      return { homeWin: true, awayWin: false, tie: false };
    } else if (game.away_score > game.home_score) {
      return { homeWin: false, awayWin: true, tie: false };
    } else {
      return { homeWin: false, awayWin: false, tie: true };
    }
  };

  const { homeWin, awayWin, tie } = getWinnerStatus();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link 
        href="/games"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Game Log
      </Link>

      {/* Game Header */}
      <div className="bg-card rounded-xl border border-border p-8 mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Game Details</h1>
          <div className="text-sm text-muted-foreground">
            {game.round?.grade?.season?.competition?.name} • {game.round?.grade?.season?.name} • {game.round?.grade?.name} • {game.round?.name}
          </div>
        </div>

        {/* Teams and Score */}
        <div className="flex items-center justify-center gap-8 mb-6">
          {/* Home Team */}
          <div className="text-center flex-1 max-w-xs">
            <Link 
              href={`/teams/${game.home_team_id}`}
              className="block hover:text-accent transition-colors"
            >
              <div className={`font-bold text-xl mb-2 ${homeWin ? 'text-green-400' : ''}`}>
                {game.home_team?.name || "Unknown Team"}
              </div>
              <div className={`text-4xl font-bold ${homeWin ? 'text-green-400' : ''}`}>
                {game.home_score ?? "-"}
              </div>
              {homeWin && (
                <div className="text-sm text-green-400 font-medium mt-1">WINNER</div>
              )}
            </Link>
          </div>

          {/* VS */}
          <div className="text-2xl font-bold text-muted-foreground px-4">
            {tie ? "DRAW" : "VS"}
          </div>

          {/* Away Team */}
          <div className="text-center flex-1 max-w-xs">
            <Link 
              href={`/teams/${game.away_team_id}`}
              className="block hover:text-accent transition-colors"
            >
              <div className={`font-bold text-xl mb-2 ${awayWin ? 'text-green-400' : ''}`}>
                {game.away_team?.name || "Unknown Team"}
              </div>
              <div className={`text-4xl font-bold ${awayWin ? 'text-green-400' : ''}`}>
                {game.away_score ?? "-"}
              </div>
              {awayWin && (
                <div className="text-sm text-green-400 font-medium mt-1">WINNER</div>
              )}
            </Link>
          </div>
        </div>

        {/* Game Info */}
        <div className="flex items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span>
              {formatDate(game.date)}
              {game.time && ` at ${formatTime(game.time)}`}
            </span>
          </div>
          {game.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{game.venue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Point Differential"
          value={game.home_score !== null && game.away_score !== null 
            ? Math.abs(game.home_score - game.away_score) 
            : "-"}
          icon={Trophy}
        />
        <StatCard
          label="Total Points"
          value={game.home_score !== null && game.away_score !== null 
            ? game.home_score + game.away_score 
            : "-"}
          icon={Users}
        />
        <StatCard
          label="Competition"
          value={game.round?.grade?.name || "-"}
          icon={Trophy}
        />
      </div>

      {/* Team Links Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Team Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/teams/${game.home_team_id}`}
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
          >
            <Users className="w-5 h-5 text-accent" />
            <div>
              <div className="font-medium">{game.home_team?.name || "Unknown Team"}</div>
              <div className="text-sm text-muted-foreground">View team stats & roster</div>
            </div>
          </Link>
          <Link
            href={`/teams/${game.away_team_id}`}
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
          >
            <Users className="w-5 h-5 text-accent" />
            <div>
              <div className="font-medium">{game.away_team?.name || "Unknown Team"}</div>
              <div className="text-sm text-muted-foreground">View team stats & roster</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}