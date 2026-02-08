"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useState } from "react";

type PlayerStat = {
  id: string;
  player_id: string;
  grade_id: string;
  team_name: string;
  games_played: number;
  total_points: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  ranking: number | null;
  grade_name: string;
  grade_type: string | null;
  season_name: string;
  competition_name: string;
};

type Season = {
  id: string;
  competition_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  competition_name: string;
};

interface PlayerTrendsChartProps {
  playerStats: PlayerStat[];
  seasons: Season[];
  playerId: string;
}

const STAT_CONFIG = {
  ppg: {
    label: "Points Per Game",
    color: "#3b82f6",
    getValue: (stat: PlayerStat) => 
      stat.games_played > 0 ? +(stat.total_points / stat.games_played).toFixed(1) : 0,
  },
  twoPoint: {
    label: "2PT Made",
    color: "#22c55e",
    getValue: (stat: PlayerStat) => stat.two_point || 0,
  },
  threePoint: {
    label: "3PT Made",
    color: "#f59e0b",
    getValue: (stat: PlayerStat) => stat.three_point || 0,
  },
  foulsPerGame: {
    label: "Fouls Per Game",
    color: "#ef4444",
    getValue: (stat: PlayerStat) => 
      stat.games_played > 0 ? +(stat.total_fouls / stat.games_played).toFixed(1) : 0,
  },
};

type StatKey = keyof typeof STAT_CONFIG;

export function PlayerTrendsChart({ playerStats, seasons, playerId }: PlayerTrendsChartProps) {
  const [selectedStats, setSelectedStats] = useState<Set<StatKey>>(new Set(['ppg']));
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  // Filter stats by season if one is selected
  const filteredStats = selectedSeason === 'all' 
    ? playerStats 
    : playerStats.filter(stat => {
        // Find the season that contains this stat's grade
        const season = seasons.find(s => s.name === stat.season_name);
        return season?.id === selectedSeason;
      });

  // Prepare chart data
  const chartData = filteredStats
    .map((stat, index) => {
      const dataPoint: any = {
        index,
        label: stat.competition_name && stat.season_name 
          ? `${stat.competition_name} - ${stat.season_name}${stat.grade_name ? ` (${stat.grade_name})` : ''}`
          : `Entry ${index + 1}`,
        fullLabel: `${stat.competition_name || 'Unknown'} - ${stat.season_name || 'Unknown'} - ${stat.grade_name || 'Unknown Grade'}`,
        games: stat.games_played,
      };

      // Add selected stats to data point
      Object.entries(STAT_CONFIG).forEach(([key, config]) => {
        dataPoint[key] = config.getValue(stat);
      });

      return dataPoint;
    })
    .sort((a, b) => {
      // Sort by season name and competition name for better chronological order
      return a.label.localeCompare(b.label);
    });

  const handleStatToggle = (stat: StatKey) => {
    const newSelected = new Set(selectedStats);
    if (newSelected.has(stat)) {
      if (newSelected.size > 1) { // Keep at least one stat selected
        newSelected.delete(stat);
      }
    } else {
      newSelected.add(stat);
    }
    setSelectedStats(newSelected);
  };

  const availableSeasons = [
    { id: 'all', name: 'All Seasons' },
    ...seasons.filter(season => 
      playerStats.some(stat => stat.season_name === season.name)
    ).map(season => ({
      id: season.id,
      name: season.name
    }))
  ];

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-muted-foreground text-center py-8">
          No performance data available for trends analysis.
        </p>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-muted-foreground text-center py-8">
          Trend analysis requires data from multiple competitions or seasons.
          <br />
          This player has data from only one entry: {chartData[0].fullLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Season Selector */}
        {availableSeasons.length > 2 && (
          <div>
            <label className="block text-sm font-medium mb-2">Season Filter:</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-48"
            >
              {availableSeasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stat Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Statistics to Display:</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STAT_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleStatToggle(key as StatKey)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedStats.has(key as StatKey)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-background text-muted-foreground border-border hover:border-muted'
                }`}
              >
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }} 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              tick={{ fill: "#94a3b8", fontSize: 12 }} 
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip
              contentStyle={{ 
                background: "#1e293b", 
                border: "1px solid #334155", 
                borderRadius: 8,
                fontSize: 12
              }}
              labelStyle={{ color: "#f1f5f9", fontWeight: 600 }}
              formatter={(value: any, name: string | undefined) => {
                const config = Object.values(STAT_CONFIG).find(c => c.label === name);
                return [
                  typeof value === 'number' ? value.toFixed(1) : value,
                  name || 'Unknown'
                ];
              }}
              labelFormatter={(label) => {
                const dataPoint = chartData.find(d => d.label === label);
                return `${dataPoint?.fullLabel} (${dataPoint?.games} games)`;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {Array.from(selectedStats).map((statKey) => {
              const config = STAT_CONFIG[statKey];
              return (
                <Line
                  key={statKey}
                  type="monotone"
                  dataKey={statKey}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                  name={config.label}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Description */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Performance trends across {filteredStats.length} competition entries.
          {selectedSeason !== 'all' && ` Filtered by: ${availableSeasons.find(s => s.id === selectedSeason)?.name}`}
        </p>
        <p className="mt-1">
          Note: Data points represent season/competition averages, not individual games.
        </p>
      </div>
    </div>
  );
}