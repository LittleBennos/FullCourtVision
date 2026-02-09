"use client";

import { useState } from "react";
import { 
  Treemap, 
  ResponsiveContainer, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { HeatmapRegion } from "@/lib/data";

const COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
];

const viewOptions = [
  { key: "treemap", label: "Treemap", description: "Region size shows player count" },
  { key: "bubble", label: "Bubble Chart", description: "Position by players/games, size by organisations" },
  { key: "bar", label: "Bar Chart", description: "Compare regions by player count" },
] as const;

type ViewType = (typeof viewOptions)[number]["key"];

type Props = {
  data: HeatmapRegion[];
};

// Custom treemap component to better handle data
const CustomizedTreemap = ({ data }: { data: HeatmapRegion[] }) => {
  const treemapData = data.map((region, _index) => ({
    name: region.region,
    value: region.players,
    organisations: region.organisations,
    games: region.games,
    teams: region.teams,
    density: region.density,
  }));

  return (
    <ResponsiveContainer width="100%" height={600}>
      <Treemap
        data={treemapData}
        dataKey="value"
        aspectRatio={16 / 9}
        stroke="#374151"
        content={({ _root, depth, x, y, width, height, index, name, value }) => {
          if (depth === 1) {
            const data = treemapData[index];
            return (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  style={{
                    fill: COLORS[index % COLORS.length],
                    fillOpacity: 0.8,
                    stroke: "#374151",
                    strokeWidth: 2,
                  }}
                />
                {width > 80 && height > 40 && (
                  <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="white"
                    fontSize={Math.min(width / 6, height / 4, 16)}
                    fontWeight="bold"
                    className="drop-shadow-lg"
                  >
                    {name}
                  </text>
                )}
                {width > 120 && height > 60 && (
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 20}
                    textAnchor="middle"
                    fill="white"
                    fontSize={Math.min(width / 8, height / 6, 12)}
                    className="drop-shadow-lg"
                  >
                    {value} players
                  </text>
                )}
                {width > 150 && height > 80 && (
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 35}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={Math.min(width / 10, height / 8, 10)}
                    className="drop-shadow-lg"
                  >
                    {data?.organisations} orgs • {data?.games} games
                  </text>
                )}
              </g>
            );
          }
          return <g></g>;
        }}
      />
    </ResponsiveContainer>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 text-sm">
        <h3 className="font-bold text-foreground mb-2">{data.region}</h3>
        <div className="space-y-1 text-muted-foreground">
          <div>Players: <span className="font-semibold text-foreground">{data.players.toLocaleString()}</span></div>
          <div>Organisations: <span className="font-semibold text-foreground">{data.organisations}</span></div>
          <div>Teams: <span className="font-semibold text-foreground">{data.teams}</span></div>
          <div>Games: <span className="font-semibold text-foreground">{data.games.toLocaleString()}</span></div>
          <div>Density: <span className="font-semibold text-foreground">{data.density} players/org</span></div>
        </div>
      </div>
    );
  }
  return null;
};

export function HeatmapClient({ data }: Props) {
  const [view, setView] = useState<ViewType>("treemap");

  const activeView = viewOptions.find(v => v.key === view)!;
  
  // Filter out regions with very few players for cleaner visualization
  const filteredData = data.filter(d => d.players >= 50);
  const topRegions = filteredData.slice(0, 20); // Show top 20 regions

  const renderVisualization = () => {
    switch (view) {
      case "treemap":
        return <CustomizedTreemap data={topRegions} />;
      
      case "bubble":
        return (
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart data={topRegions}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number" 
                dataKey="players" 
                name="Players"
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis 
                type="number" 
                dataKey="games" 
                name="Games"
                tickFormatter={(value) => value.toLocaleString()}
              />
              <ZAxis type="number" dataKey="organisations" range={[64, 400]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Regions" dataKey="organisations" fill="#3b82f6">
                {topRegions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={600}>
            <BarChart data={topRegions} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="region" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="players" name="Players" fill="#3b82f6">
                {topRegions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Basketball Activity Heatmap</h1>
      <p className="text-muted-foreground mb-6">
        See where basketball activity is concentrated across Victoria by region and suburb
      </p>

      {/* View Selector */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {viewOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setView(option.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                view === option.key
                  ? "bg-accent text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {activeView.description}
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {data.reduce((sum, region) => sum + region.players, 0).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Players</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {data.length}
          </div>
          <div className="text-sm text-muted-foreground">Active Regions</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {data.reduce((sum, region) => sum + region.organisations, 0).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Organisations</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {data.reduce((sum, region) => sum + region.games, 0).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Games Played</div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        {renderVisualization()}
      </div>

      {/* Top Regions Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold">Top Regions by Player Count</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 font-medium w-12">#</th>
                <th className="text-left px-6 py-3 font-medium">Region</th>
                <th className="text-right px-6 py-3 font-medium">Players</th>
                <th className="text-right px-6 py-3 font-medium">Organisations</th>
                <th className="text-right px-6 py-3 font-medium">Teams</th>
                <th className="text-right px-6 py-3 font-medium">Games</th>
                <th className="text-right px-6 py-3 font-medium">Density</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topRegions.map((region, index) => (
                <tr key={region.region} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 text-muted-foreground">
                    {index < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                        index === 1 ? "bg-gray-400/20 text-gray-300" :
                        "bg-orange-500/20 text-orange-400"
                      }`}>
                        {index + 1}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td className="px-6 py-3 font-medium text-foreground">{region.region}</td>
                  <td className="px-6 py-3 text-right tabular-nums font-bold">
                    {region.players.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {region.organisations}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {region.teams}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {region.games.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {region.density}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}