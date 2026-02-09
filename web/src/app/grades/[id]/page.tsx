import { getGradeById, getGradeStandings, getGradeTopScorers, getGradeFixtures, getGradeFinalsGames } from "@/lib/data";
import { notFound } from "next/navigation";
import { Trophy, Target, Calendar } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BracketView } from "@/components/bracket-view";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grade = await getGradeById(id);
  if (!grade) return { title: "Grade Not Found — FullCourtVision" };
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fullcourtvision.com';
  
  return {
    title: `${grade.name} — ${grade.competition_name}`,
    description: `${grade.name} grade in ${grade.competition_name} (${grade.season_name}). View team standings, top scorers, and fixtures.`,
    openGraph: {
      title: `${grade.name} — ${grade.competition_name}`,
      description: `${grade.name} grade in ${grade.competition_name} (${grade.season_name})`,
      images: [
        {
          url: `${baseUrl}/api/og?gradeId=${id}&type=grade`,
          width: 1200,
          height: 630,
          alt: `${grade.name} grade statistics`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${grade.name} — ${grade.competition_name}`,
      description: `${grade.name} grade in ${grade.competition_name} (${grade.season_name})`,
      images: [`${baseUrl}/api/og?gradeId=${id}&type=grade`],
    },
  };
}

export default async function GradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [grade, standings, topScorers, fixtures, finalsGames] = await Promise.all([
    getGradeById(id),
    getGradeStandings(id),
    getGradeTopScorers(id, 10),
    getGradeFixtures(id),
    getGradeFinalsGames(id),
  ]);
  
  if (!grade) notFound();

  const recentFixtures = fixtures.filter(f => f.home_score !== null && f.away_score !== null).slice(-10);
  const upcomingFixtures = fixtures.filter(f => f.home_score === null && f.away_score === null).slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Grades", href: "/grades" },
        { label: grade.name },
      ]} />

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{grade.name}</h1>
            <div className="text-muted-foreground space-y-1">
              <p className="text-lg">{grade.competition_name}</p>
              <p>
                <span className="text-accent">{grade.season_name}</span>
                {" · "}{grade.org_name}
              </p>
              {grade.type && <p className="text-sm">Grade Type: {grade.type}</p>}
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{standings.length}</p>
              <p className="text-sm text-muted-foreground">Teams</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{topScorers.length}</p>
              <p className="text-sm text-muted-foreground">Players</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{fixtures.length}</p>
              <p className="text-sm text-muted-foreground">Fixtures</p>
            </div>
          </div>
        </div>
      </div>

      {/* Finals Bracket */}
      {finalsGames.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Finals Bracket</h2>
            <span className="text-xs text-muted-foreground ml-2">
              {finalsGames.length} game{finalsGames.length !== 1 ? "s" : ""}
            </span>
          </div>
          <BracketView games={finalsGames} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Team Standings */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Team Standings</h2>
            </div>

            {standings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No team standings available for this grade.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-3 font-medium">#</th>
                      <th className="text-left px-3 py-3 font-medium">Team</th>
                      <th className="text-right px-3 py-3 font-medium">W</th>
                      <th className="text-right px-3 py-3 font-medium">L</th>
                      <th className="text-right px-3 py-3 font-medium">PCT</th>
                      <th className="text-right px-3 py-3 font-medium">PF</th>
                      <th className="text-right px-3 py-3 font-medium">PA</th>
                      <th className="text-right px-3 py-3 font-medium">DIFF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standings.map((team) => (
                      <tr key={team.id} className="hover:bg-muted/30">
                        <td className="px-3 py-3 text-muted-foreground">{team.rank}</td>
                        <td className="px-3 py-3">
                          <Link href={`/teams/${team.id}`} className="text-accent hover:underline font-medium">
                            {team.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{team.org_name}</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-green-400">{team.wins}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-red-400">{team.losses}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{team.pct.toFixed(3)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{team.points_for}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{team.points_against}</td>
                        <td className={`px-3 py-3 text-right tabular-nums font-semibold ${team.diff > 0 ? "text-green-400" : team.diff < 0 ? "text-red-400" : ""}`}>
                          {team.diff > 0 ? "+" : ""}{team.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Top Scorers */}
        <div>
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Top 10 Scorers</h2>
            </div>

            {topScorers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No scorer data available.</p>
            ) : (
              <div className="space-y-3">
                {topScorers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}</span>
                      <div>
                        <Link href={`/players/${player.id}`} className="text-accent hover:underline font-medium text-sm">
                          {player.first_name} {player.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{player.total_games} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{player.total_points}</p>
                      <p className="text-xs text-muted-foreground">{player.ppg} PPG</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixtures */}
      {fixtures.length > 0 && (
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          {/* Recent Results */}
          {recentFixtures.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">Recent Results</h2>
              </div>
              <div className="space-y-3">
                {recentFixtures.map((fixture) => (
                  <div key={fixture.id} className="p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fixture.home_team_name}</span>
                          <span className="text-accent font-bold">{fixture.home_score}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium">{fixture.away_team_name}</span>
                          <span className="text-accent font-bold">{fixture.away_score}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {fixture.round_name && <p>{fixture.round_name}</p>}
                        {fixture.date && <p>{new Date(fixture.date).toLocaleDateString()}</p>}
                        {fixture.venue && <p>{fixture.venue}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Fixtures */}
          {upcomingFixtures.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">Upcoming Fixtures</h2>
              </div>
              <div className="space-y-3">
                {upcomingFixtures.map((fixture) => (
                  <div key={fixture.id} className="p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{fixture.home_team_name}</div>
                        <div className="text-muted-foreground">vs {fixture.away_team_name}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {fixture.round_name && <p>{fixture.round_name}</p>}
                        {fixture.date && <p>{new Date(fixture.date).toLocaleDateString()}</p>}
                        {fixture.time && <p>{fixture.time}</p>}
                        {fixture.venue && <p>{fixture.venue}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}