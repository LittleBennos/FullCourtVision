import { getPlayerDetails } from "@/lib/data";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ScoringTrendChart, ShotBreakdownChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlayerDetails(id);
  if (!data) return { title: "Player Not Found" };
  return {
    title: `${data.player.first_name} ${data.player.last_name} — FullCourtVision`,
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPlayerDetails(id);
  if (!data) notFound();

  const { player, stats } = data;
  const totalGames = stats.reduce((s: number, st: any) => s + (st.games_played || 0), 0);
  const totalPoints = stats.reduce((s: number, st: any) => s + (st.total_points || 0), 0);
  const totalOnePoint = stats.reduce((s: number, st: any) => s + (st.one_point || 0), 0);
  const totalTwoPoint = stats.reduce((s: number, st: any) => s + (st.two_point || 0), 0);
  const totalThreePoint = stats.reduce((s: number, st: any) => s + (st.three_point || 0), 0);
  const totalFouls = stats.reduce((s: number, st: any) => s + (st.total_fouls || 0), 0);
  const ppg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";

  const trendData = stats.map((st: any) => ({
    name: st.season_name || st.grade_name || "Unknown",
    ppg: st.games_played > 0 ? +(st.total_points / st.games_played).toFixed(1) : 0,
    totalPoints: st.total_points || 0,
  }));

  const shotData = [
    { name: "1-Pointers", value: totalOnePoint },
    { name: "2-Pointers", value: totalTwoPoint },
    { name: "3-Pointers", value: totalThreePoint },
  ].filter((d) => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/players" className="inline-flex items-center gap-1 text-accent hover:underline text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Players
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {player.first_name} {player.last_name}
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { label: "PPG", value: ppg, accent: true },
            { label: "Total Points", value: totalPoints.toLocaleString() },
            { label: "Games", value: totalGames },
            { label: "Total Fouls", value: totalFouls },
            { label: "Seasons", value: stats.length },
          ].map(({ label, value, accent }) => (
            <div key={label}>
              <p className={`text-2xl md:text-3xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Scoring Trend</h2>
          <ScoringTrendChart data={trendData} />
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Shot Type Breakdown</h2>
          <ShotBreakdownChart data={shotData} />
        </div>
      </div>

      {/* Season Breakdown */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Season Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Season</th>
                <th className="text-left px-4 py-3 font-medium">Grade</th>
                <th className="text-left px-4 py-3 font-medium">Team</th>
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
              {stats.map((st: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{st.season_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{st.grade_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{st.team_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.games_played}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{st.total_points}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-accent">
                    {st.games_played > 0 ? (st.total_points / st.games_played).toFixed(1) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.one_point}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.two_point}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.three_point}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.total_fouls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
