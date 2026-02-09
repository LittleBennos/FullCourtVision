"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Building2, Users, Trophy, Target, TrendingUp, BarChart3 } from "lucide-react";
import type { Organisation, OrgAnalyticsData } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { Breadcrumbs } from "@/components/breadcrumbs";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d"];

interface Props {
  organisation: Organisation;
  analytics: OrgAnalyticsData;
}

export function OrgAnalyticsClient({ organisation, analytics }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Organisations", href: "/organisations" },
          { label: organisation.name, href: `/organisations/${organisation.id}` },
          { label: "Analytics" },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">{organisation.name} Analytics</h1>
          <p className="text-muted-foreground">Performance insights across all teams and seasons</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Players" value={analytics.totalPlayers} icon={Users} />
        <StatCard label="Total Games" value={analytics.totalGames} icon={Trophy} />
        <StatCard label="Total Points" value={analytics.totalPoints.toLocaleString()} icon={Target} />
        <StatCard label="Avg PPG" value={analytics.avgPPG.toString()} icon={TrendingUp} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Team Performance Bar Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Team Performance (Win Rate %)</h2>
          {analytics.teamPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={analytics.teamPerformance.slice(0, 15)}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [`${value}%`, "Win Rate"]}
                />
                <Bar dataKey="winRate" fill="#8884d8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">No team data available</div>
          )}
        </div>

        {/* Season Growth Line Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Season-over-Season Growth</h2>
          {analytics.seasonGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analytics.seasonGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="season" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Line yAxisId="left" type="monotone" dataKey="players" stroke="#82ca9d" strokeWidth={2} name="Players" dot={{ fill: "#82ca9d" }} />
                <Line yAxisId="right" type="monotone" dataKey="games" stroke="#8884d8" strokeWidth={2} name="Games" dot={{ fill: "#8884d8" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">No season data available</div>
          )}
        </div>
      </div>

      {/* Age Distribution + Top Scorers */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Age Distribution */}
        {analytics.ageDistribution.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Age Group Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.ageDistribution}
                  dataKey="count"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {analytics.ageDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Team PPG Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Team Points Per Game</h2>
          {analytics.teamPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.teamPerformance.slice(0, 10).sort((a, b) => b.ppg - a.ppg)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [Number(value).toFixed(1), "PPG"]}
                />
                <Bar dataKey="ppg" fill="#ffc658" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>

      {/* Top Scorers Table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Top Scorers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Player</th>
                <th className="text-left px-4 py-3 font-medium">Team(s)</th>
                <th className="text-right px-4 py-3 font-medium">Games</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">PPG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.topScorers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No player data available
                  </td>
                </tr>
              ) : (
                analytics.topScorers.map((player, i) => (
                  <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/players/${player.id}`} className="text-accent hover:underline font-medium">
                        {player.first_name} {player.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{player.team_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{player.total_games}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent">{player.total_points}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{player.ppg}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
