import { getTeamById, getTeamSchedule, getSeasonsList } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SeasonFilter } from "@/components/season-filter";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeamById(id);
  if (!team) return { title: "Team Not Found — FullCourtVision" };
  return {
    title: `${team.name} Schedule — FullCourtVision`,
    description: `View the full fixture and results schedule for ${team.name}.`,
  };
}

export default async function TeamSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season: seasonFilter } = await searchParams;

  const [team, allGames, seasons] = await Promise.all([
    getTeamById(id),
    getTeamSchedule(id),
    getSeasonsList(),
  ]);

  if (!team) notFound();

  // Filter by season if selected
  const games = seasonFilter
    ? allGames.filter((g) => g.season_id === seasonFilter)
    : allGames;

  // Separate upcoming (no score) and completed
  const completed = games.filter((g) => g.home_score !== null && g.away_score !== null);
  const upcoming = games.filter((g) => g.home_score === null || g.away_score === null);

  // Get unique seasons from this team's games for the filter
  const teamSeasonIds = new Set(allGames.map((g) => g.season_id));
  const relevantSeasons = seasons.filter((s) => teamSeasonIds.has(s.id));

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getResult = (game: typeof games[0]) => {
    if (game.home_score === null || game.away_score === null) return null;
    const isHome = game.home_team_id === id;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    if (teamScore > oppScore) return "W";
    if (teamScore < oppScore) return "L";
    return "D";
  };

  const resultColor = (r: string | null) => {
    if (r === "W") return "text-green-400 bg-green-400/10";
    if (r === "L") return "text-red-400 bg-red-400/10";
    if (r === "D") return "text-yellow-400 bg-yellow-400/10";
    return "";
  };

  const renderGame = (game: typeof games[0]) => {
    const isHome = game.home_team_id === id;
    const opponent = isHome ? game.away_team_name : game.home_team_name;
    const opponentId = isHome ? game.away_team_id : game.home_team_id;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    const result = getResult(game);
    const homeAway = isHome ? "vs" : "@";

    return (
      <Link
        key={game.id}
        href={`/games/${game.id}`}
        className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:bg-accent/5 transition-colors"
      >
        {/* Result indicator */}
        {result && (
          <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-md ${resultColor(result)}`}>
            {result}
          </span>
        )}
        {!result && (
          <span className="w-8 h-8 flex items-center justify-center rounded-md bg-muted text-muted-foreground text-xs font-medium">
            —
          </span>
        )}

        {/* Game info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{homeAway}</span>
            <span className="font-medium truncate">{opponent}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(game.date)}
              {game.time && <span className="ml-1">{formatTime(game.time)}</span>}
            </span>
            {game.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {game.venue}
              </span>
            )}
            {game.round_name && (
              <span className="hidden sm:inline">{game.round_name}</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-right tabular-nums">
          {teamScore !== null && oppScore !== null ? (
            <span className="text-lg font-bold">
              {teamScore} – {oppScore}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Upcoming</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Teams", href: "/teams" },
          { label: team.name, href: `/teams/${id}` },
          { label: "Schedule" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">Schedule &amp; Results</p>
        </div>

        {/* Season filter */}
        {relevantSeasons.length > 1 && (
          <SeasonFilter seasons={relevantSeasons} currentSeason={seasonFilter} />
        )}
      </div>

      {/* Upcoming games */}
      {upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(renderGame)}
          </div>
        </div>
      )}

      {/* Completed games */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Results ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No results found.</p>
        ) : (
          <div className="space-y-2">{completed.map(renderGame)}</div>
        )}
      </div>
    </div>
  );
}
