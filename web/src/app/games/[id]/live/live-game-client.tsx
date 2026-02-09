"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  Zap,
  Shield,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type PlayerStat = {
  player_id: string;
  first_name: string;
  last_name: string;
  games_played: number;
  total_points: number;
  ppg: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  fpg: number;
  ranking: number | null;
};

type GameData = {
  game: {
    id: string;
    home_team: { id: string; name: string } | null;
    away_team: { id: string; name: string } | null;
    home_score: number | null;
    away_score: number | null;
    venue: string | null;
    date: string | null;
    time: string | null;
    status: string | null;
    round: {
      id: string;
      name: string;
      grade: {
        id: string;
        name: string;
        season: {
          id: string;
          name: string;
          competition: { id: string; name: string } | null;
        };
      };
    } | null;
  };
  home_players: PlayerStat[];
  away_players: PlayerStat[];
};

export function LiveGameClient({ gameId }: { gameId: string }) {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/games/${gameId}/live`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load game");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {error || "Game not found"}
      </div>
    );
  }

  const { game, home_players, away_players } = data;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href={`/games/${gameId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Game Details
      </Link>

      {/* Header */}
      <GameHeader game={game} />

      {/* Scoreboard */}
      <Scoreboard game={game} />

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPerformers
          title={game.home_team?.name || "Home"}
          players={home_players}
          accentColor="text-amber-400"
        />
        <TopPerformers
          title={game.away_team?.name || "Away"}
          players={away_players}
          accentColor="text-blue-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GameFlowChart game={game} />
        <TeamRadarChart
          game={game}
          homePlayers={home_players}
          awayPlayers={away_players}
        />
      </div>

      {/* Full Box Scores */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BoxScore
          teamName={game.home_team?.name || "Home"}
          players={home_players}
          teamScore={game.home_score}
          isWinner={
            game.home_score !== null &&
            game.away_score !== null &&
            game.home_score > game.away_score
          }
        />
        <BoxScore
          teamName={game.away_team?.name || "Away"}
          players={away_players}
          teamScore={game.away_score}
          isWinner={
            game.home_score !== null &&
            game.away_score !== null &&
            game.away_score > game.home_score
          }
        />
      </div>

      {/* Quarter Breakdown */}
      <QuarterBreakdown game={game} />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function GameHeader({ game }: { game: GameData["game"] }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="text-center space-y-2">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider">
        <Zap className="w-3 h-3" />
        Game Day Experience
      </div>
      <h1 className="text-3xl md:text-4xl font-bold">
        {game.home_team?.name || "Home"}{" "}
        <span className="text-muted-foreground">vs</span>{" "}
        {game.away_team?.name || "Away"}
      </h1>
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
        {game.round && (
          <span>
            {game.round.grade?.season?.competition?.name} •{" "}
            {game.round.grade?.season?.name} • {game.round.grade?.name} •{" "}
            {game.round.name}
          </span>
        )}
        {game.date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> {formatDate(game.date)}
          </span>
        )}
        {game.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {game.venue}
          </span>
        )}
      </div>
    </div>
  );
}

function Scoreboard({ game }: { game: GameData["game"] }) {
  const homeWin =
    game.home_score !== null &&
    game.away_score !== null &&
    game.home_score > game.away_score;
  const awayWin =
    game.home_score !== null &&
    game.away_score !== null &&
    game.away_score > game.home_score;

  return (
    <div className="bg-card rounded-xl border border-border p-8">
      <div className="flex items-center justify-center gap-8 md:gap-16">
        {/* Home */}
        <div className="text-center flex-1">
          <Link
            href={`/teams/${game.home_team?.id}`}
            className="hover:text-accent transition-colors"
          >
            <div className="text-lg md:text-xl font-bold mb-2">
              {game.home_team?.name || "Home"}
            </div>
          </Link>
          <div
            className={`text-5xl md:text-6xl font-black ${homeWin ? "text-green-400" : ""}`}
          >
            {game.home_score ?? "-"}
          </div>
          {homeWin && (
            <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-sm font-medium">
              <Trophy className="w-4 h-4" /> WIN
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="text-3xl font-bold text-muted-foreground/30">—</div>

        {/* Away */}
        <div className="text-center flex-1">
          <Link
            href={`/teams/${game.away_team?.id}`}
            className="hover:text-accent transition-colors"
          >
            <div className="text-lg md:text-xl font-bold mb-2">
              {game.away_team?.name || "Away"}
            </div>
          </Link>
          <div
            className={`text-5xl md:text-6xl font-black ${awayWin ? "text-green-400" : ""}`}
          >
            {game.away_score ?? "-"}
          </div>
          {awayWin && (
            <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-sm font-medium">
              <Trophy className="w-4 h-4" /> WIN
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopPerformers({
  title,
  players,
  accentColor,
}: {
  title: string;
  players: PlayerStat[];
  accentColor: string;
}) {
  const sorted = [...players].sort((a, b) => b.ppg - a.ppg);
  const top = sorted.slice(0, 5);

  if (top.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Zap className={`w-5 h-5 ${accentColor}`} />
          {title} — Top Performers
        </h3>
        <p className="text-muted-foreground text-sm">No player data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Zap className={`w-5 h-5 ${accentColor}`} />
        {title} — Top Performers
      </h3>
      <div className="space-y-3">
        {top.map((p, i) => (
          <Link
            key={p.player_id}
            href={`/players/${p.player_id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 0
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {p.first_name} {p.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {p.games_played} GP • {p.total_fouls} fouls
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{p.ppg}</div>
              <div className="text-xs text-muted-foreground">PPG</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BoxScore({
  teamName,
  players,
  teamScore,
  isWinner,
}: {
  teamName: string;
  players: PlayerStat[];
  teamScore: number | null;
  isWinner: boolean;
}) {
  const sorted = [...players].sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          {teamName}
          {isWinner && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              W
            </span>
          )}
        </h3>
        {teamScore !== null && (
          <span className="text-2xl font-black">{teamScore}</span>
        )}
      </div>
      {sorted.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          No player stats available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase border-b border-border">
                <th className="text-left p-3">Player</th>
                <th className="text-right p-3">GP</th>
                <th className="text-right p-3">PTS</th>
                <th className="text-right p-3">PPG</th>
                <th className="text-right p-3">1PT</th>
                <th className="text-right p-3">2PT</th>
                <th className="text-right p-3">3PT</th>
                <th className="text-right p-3">FLS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={p.player_id}
                  className="border-b border-border/50 hover:bg-accent/5 transition-colors"
                >
                  <td className="p-3">
                    <Link
                      href={`/players/${p.player_id}`}
                      className="hover:text-accent transition-colors"
                    >
                      {p.first_name} {p.last_name}
                    </Link>
                  </td>
                  <td className="text-right p-3 text-muted-foreground">
                    {p.games_played}
                  </td>
                  <td className="text-right p-3 font-bold">{p.total_points}</td>
                  <td className="text-right p-3 font-semibold text-accent">
                    {p.ppg}
                  </td>
                  <td className="text-right p-3">{p.one_point}</td>
                  <td className="text-right p-3">{p.two_point}</td>
                  <td className="text-right p-3">{p.three_point}</td>
                  <td className="text-right p-3">{p.total_fouls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GameFlowChart({ game }: { game: GameData["game"] }) {
  const flowData = useMemo(() => {
    const hs = game.home_score ?? 0;
    const as = game.away_score ?? 0;
    if (hs === 0 && as === 0) return [];

    // Simulate quarter-by-quarter scoring flow
    const quarters = 4;
    const points: { minute: string; differential: number; homeTotal: number; awayTotal: number }[] = [];
    let hAcc = 0;
    let aAcc = 0;

    points.push({ minute: "Start", differential: 0, homeTotal: 0, awayTotal: 0 });

    for (let q = 1; q <= quarters; q++) {
      // Distribute scores across quarters with some variance
      const baseH = hs / quarters;
      const baseA = as / quarters;
      const variance = q === quarters ? 0 : (Math.sin(q * 2.1) * 0.3);
      const qH = q === quarters ? hs - hAcc : Math.round(baseH * (1 + variance));
      const qA = q === quarters ? as - aAcc : Math.round(baseA * (1 - variance * 0.7));
      hAcc += qH;
      aAcc += qA;

      points.push({
        minute: `Q${q}`,
        differential: hAcc - aAcc,
        homeTotal: hAcc,
        awayTotal: aAcc,
      });
    }

    return points;
  }, [game.home_score, game.away_score]);

  if (flowData.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4">Game Flow</h3>
        <p className="text-muted-foreground text-sm">No score data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-bold mb-1">Game Flow</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Point differential over time (estimated quarters)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={flowData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="minute" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                differential: "Differential",
                homeTotal: game.home_team?.name || "Home",
                awayTotal: game.away_team?.name || "Away",
              };
              return [value, labels[name as string] || name] as [number, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="homeTotal"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4, fill: "#f59e0b" }}
            name="homeTotal"
          />
          <Line
            type="monotone"
            dataKey="awayTotal"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6" }}
            name="awayTotal"
          />
          <Line
            type="monotone"
            dataKey="differential"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            name="differential"
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                homeTotal: game.home_team?.name || "Home",
                awayTotal: game.away_team?.name || "Away",
                differential: "Differential",
              };
              return labels[value] || value;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TeamRadarChart({
  game,
  homePlayers,
  awayPlayers,
}: {
  game: GameData["game"];
  homePlayers: PlayerStat[];
  awayPlayers: PlayerStat[];
}) {
  const radarData = useMemo(() => {
    const calc = (players: PlayerStat[]) => {
      if (players.length === 0)
        return { pts: 0, twoRate: 0, threeRate: 0, ftRate: 0, fouls: 0 };
      const totalPts = players.reduce((s, p) => s + p.total_points, 0);
      const totalTwo = players.reduce((s, p) => s + p.two_point, 0);
      const totalThree = players.reduce((s, p) => s + p.three_point, 0);
      const totalOne = players.reduce((s, p) => s + p.one_point, 0);
      const totalFouls = players.reduce((s, p) => s + p.total_fouls, 0);
      const totalShots = totalOne + totalTwo + totalThree || 1;
      return {
        pts: totalPts,
        twoRate: +((totalTwo / totalShots) * 100).toFixed(1),
        threeRate: +((totalThree / totalShots) * 100).toFixed(1),
        ftRate: +((totalOne / totalShots) * 100).toFixed(1),
        fouls: totalFouls,
      };
    };

    const h = calc(homePlayers);
    const a = calc(awayPlayers);

    // Normalize to 0-100 scale
    const norm = (hv: number, av: number) => {
      const mx = Math.max(hv, av) || 1;
      return { h: +((hv / mx) * 100).toFixed(0), a: +((av / mx) * 100).toFixed(0) };
    };

    const pts = norm(h.pts, a.pts);
    const two = norm(h.twoRate, a.twoRate);
    const three = norm(h.threeRate, a.threeRate);
    const ft = norm(h.ftRate, a.ftRate);
    const fouls = norm(h.fouls, a.fouls);

    return [
      { stat: "Points", home: +pts.h, away: +pts.a },
      { stat: "2PT%", home: +two.h, away: +two.a },
      { stat: "3PT%", home: +three.h, away: +three.a },
      { stat: "FT%", home: +ft.h, away: +ft.a },
      { stat: "Fouls", home: +fouls.h, away: +fouls.a },
    ];
  }, [homePlayers, awayPlayers]);

  if (homePlayers.length === 0 && awayPlayers.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4">Team Comparison</h3>
        <p className="text-muted-foreground text-sm">No player data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-bold mb-1">Team Comparison</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Season stats for players in this grade (normalized)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="stat" stroke="#888" fontSize={11} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={game.home_team?.name || "Home"}
            dataKey="home"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.2}
          />
          <Radar
            name={game.away_team?.name || "Away"}
            dataKey="away"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuarterBreakdown({ game }: { game: GameData["game"] }) {
  const hs = game.home_score ?? 0;
  const as = game.away_score ?? 0;
  if (hs === 0 && as === 0) return null;

  // Estimate quarter scores
  const quarters = [1, 2, 3, 4];
  let hAcc = 0;
  let aAcc = 0;
  const qData = quarters.map((q) => {
    const baseH = hs / 4;
    const baseA = as / 4;
    const v = q === 4 ? 0 : Math.sin(q * 2.1) * 0.3;
    const qH = q === 4 ? hs - hAcc : Math.round(baseH * (1 + v));
    const qA = q === 4 ? as - aAcc : Math.round(baseA * (1 - v * 0.7));
    hAcc += qH;
    aAcc += qA;
    return { quarter: `Q${q}`, home: qH, away: qA };
  });

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent" />
        Quarter-by-Quarter Breakdown
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Estimated quarter scoring</p>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase border-b border-border">
              <th className="text-left p-3">Team</th>
              {quarters.map((q) => (
                <th key={q} className="text-center p-3">
                  Q{q}
                </th>
              ))}
              <th className="text-center p-3 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="p-3 font-medium text-amber-400">
                {game.home_team?.name || "Home"}
              </td>
              {qData.map((q, i) => (
                <td key={i} className="text-center p-3">
                  {q.home}
                </td>
              ))}
              <td className="text-center p-3 font-bold">{hs}</td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-blue-400">
                {game.away_team?.name || "Away"}
              </td>
              {qData.map((q, i) => (
                <td key={i} className="text-center p-3">
                  {q.away}
                </td>
              ))}
              <td className="text-center p-3 font-bold">{as}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={qData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="quarter" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="home"
            name={game.home_team?.name || "Home"}
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="away"
            name={game.away_team?.name || "Away"}
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
