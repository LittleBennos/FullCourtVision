"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useState, useMemo } from "react";

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
  twoPointPg: {
    label: "2PT Per Game",
    color: "#22c55e",
    getValue: (stat: PlayerStat) => 
      stat.games_played > 0 ? +(stat.two_point / stat.games_played).toFixed(1) : 0,
  },
  threePointPg: {
    label: "3PT Per Game", 
    color: "#f59e0b",
    getValue: (stat: PlayerStat) =>
      stat.games_played > 0 ? +(stat.three_point / stat.games_played).toFixed(1) : 0,
  },
  foulsPerGame: {
    label: "Fouls Per Game",
    color: "#ef4444", 
    getValue: (stat: PlayerStat) => 
      stat.games_played > 0 ? +(stat.total_fouls / stat.games_played).toFixed(1) : 0,
  },
  totalPoints: {
    label: "Total Points",
    color: "#8b5cf6",
    getValue: (stat: PlayerStat) => stat.total_points || 0,
  },
};

type StatKey = keyof typeof STAT_CONFIG;

export function PlayerTrendsChart({ playerStats, seasons, playerId: _playerId }: PlayerTrendsChartProps) {
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

  // Prepare chart data with better time-based ordering
  const chartData = useMemo(() => {
    return filteredStats
      .map((stat, index) => {
        // Try to find the corresponding season for better date ordering
        const season = seasons.find(s => s.name === stat.season_name);
        const seasonDate = season?.start_date ? new Date(season.start_date) : new Date(2000, 0, 1);
        
        const dataPoint: any = {
          index,
          date: seasonDate,
          dateString: seasonDate.toLocaleDateString('en-AU', { 
            year: 'numeric', 
            month: 'short'
          }),
          label: stat.competition_name && stat.season_name 
            ? `${stat.season_name}${stat.grade_name ? ` (${stat.grade_name})` : ''}`
            : `Entry ${index + 1}`,
          fullLabel: `${stat.competition_name || 'Unknown'} - ${stat.season_name || 'Unknown'} - ${stat.grade_name || 'Unknown Grade'}`,
          games: stat.games_played,
          competition: stat.competition_name,
          season: stat.season_name,
          grade: stat.grade_name,
        };

        // Add all stats to data point
        Object.entries(STAT_CONFIG).forEach(([key, config]) => {
          dataPoint[key] = config.getValue(stat);
        });

        return dataPoint;
      })
      .sort((a, b) => {
        // Sort by date first, then by competition name for chronological order
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime();
        }
        return (a.competition || '').localeCompare(b.competition || '');
      });
  }, [filteredStats, seasons]);

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
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
          <p className="text-muted-foreground">
            No game statistics available for trends analysis.
            {selectedSeason !== 'all' && ' Try selecting "All Seasons" above.'}
          </p>
        </div>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-semibold mb-2">Insufficient Data for Trends</h3>
          <p className="text-muted-foreground mb-4">
            Trend analysis requires data from multiple competitions or seasons.
          </p>
          <div className="bg-muted rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm font-medium">Single entry found:</p>
            <p className="text-sm text-muted-foreground mt-1">{chartData[0].fullLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {chartData[0].games} games • {chartData[0].ppg} PPG
            </p>
          </div>
        </div>
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
          <label className="block text-sm font-medium mb-3">Performance Metrics:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(STAT_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleStatToggle(key as StatKey)}
                className={`flex items-center px-3 py-2 text-sm rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                  selectedStats.has(key as StatKey)
                    ? 'bg-accent text-white border-accent shadow-md'
                    : 'bg-background text-muted-foreground border-border hover:border-muted hover:bg-muted/20'
                }`}
              >
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="truncate">{config.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Click metrics to compare trends. At least one must be selected.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full" role="img" aria-label={`Performance trends chart showing ${Array.from(selectedStats).map(s => STAT_CONFIG[s].label).join(', ')} across ${chartData.length} competition entries`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis 
              dataKey="dateString"
              tick={{ fill: "#94a3b8", fontSize: 10 }} 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis 
              tick={{ fill: "#94a3b8", fontSize: 11 }} 
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              width={50}
            />
            <Tooltip
              contentStyle={{ 
                background: "#1e293b", 
                border: "1px solid #334155", 
                borderRadius: 8,
                fontSize: 12,
                maxWidth: 280
              }}
              labelStyle={{ color: "#f1f5f9", fontWeight: 600 }}
              formatter={(value: any, name: string | undefined) => {
                return [
                  typeof value === 'number' ? value.toFixed(1) : value,
                  name || 'Unknown'
                ];
              }}
              labelFormatter={(label) => {
                const dataPoint = chartData.find(d => d.dateString === label);
                if (!dataPoint) return label;
                return (
                  <div className="space-y-1">
                    <div className="font-semibold">{dataPoint.fullLabel}</div>
                    <div className="text-xs text-gray-300">{dataPoint.games} games played</div>
                  </div>
                );
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
                  strokeWidth={2.5}
                  dot={{ fill: config.color, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                  name={config.label}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Description */}
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>
          Performance trends over time across {filteredStats.length} competition entries.
          {selectedSeason !== 'all' && ` Filtered by: ${availableSeasons.find(s => s.id === selectedSeason)?.name}`}
        </p>
        <p>
          Each data point shows per-game averages for that competition/season period.
          Total games represented: {chartData.reduce((sum, d) => sum + d.games, 0)} games.
        </p>
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          <span>📊 Points per game shows scoring consistency over time</span>
          <span>🎯 2PT/3PT per game tracks shooting development</span>
          <span>⚠️ Fouls per game indicates playing discipline</span>
        </div>
      </div>
    </div>
  );
}