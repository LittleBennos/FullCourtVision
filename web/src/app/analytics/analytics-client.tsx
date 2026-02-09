"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, LineChart, Area, AreaChart } from "recharts";
import type { AnalyticsData, StatsDistribution, PaceAnalysis, FoulAnalysis, GradeFoulAnalysis, ScoringEfficiency } from "../api/analytics/route";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d'];

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 min-h-[44px] rounded-lg font-medium whitespace-nowrap transition-colors ${
        isActive
          ? 'bg-accent text-white'
          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  );
}

interface StatsDistributionChartProps {
  data: StatsDistribution[];
}

function StatsDistributionChart({ data }: StatsDistributionChartProps) {
  const ppgData = data.filter(d => d.statType === 'PPG');
  const threePtData = data.filter(d => d.statType === '3PT%');
  const fpgData = data.filter(d => d.statType === 'FPG');

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Points Per Game Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ppgData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Bar dataKey="percentage" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">3-Point Percentage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={threePtData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Bar dataKey="percentage" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Fouls Per Game Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fpgData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Bar dataKey="percentage" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface PaceAnalysisChartProps {
  data: PaceAnalysis[];
}

function PaceAnalysisChart({ data }: PaceAnalysisChartProps) {
  const gradeTypeData = data.reduce((acc, item) => {
    const existing = acc.find(g => g.gradeType === item.gradeType);
    if (existing) {
      existing.totalPoints += item.avgPointsPerGame * item.totalGames;
      existing.totalGames += item.totalGames;
      existing.avgPointsPerGame = existing.totalPoints / existing.totalGames;
    } else {
      acc.push({
        gradeType: item.gradeType,
        avgPointsPerGame: item.avgPointsPerGame,
        totalPoints: item.avgPointsPerGame * item.totalGames,
        totalGames: item.totalGames
      });
    }
    return acc;
  }, [] as any[]);

  const topGrades = data.slice(0, 20);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Average Points Per Game by Grade Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradeTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="gradeType" />
              <YAxis />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, 'Avg PPG']} />
              <Bar dataKey="avgPointsPerGame" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Grade Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gradeTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.gradeType} ${(entry.percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalGames"
              >
                {gradeTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Games']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="text-lg font-semibold mb-4">Top 20 Highest-Scoring Grades</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topGrades}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="gradeName" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${Number(value).toFixed(1)}`, 'Avg PPG']}
              labelFormatter={(label) => `Grade: ${label}`}
            />
            <Bar dataKey="avgPointsPerGame" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface FoulAnalysisChartProps {
  playerData: FoulAnalysis[];
  gradeData: GradeFoulAnalysis[];
}

function FoulAnalysisChart({ playerData, gradeData }: FoulAnalysisChartProps) {
  const topFoulPlayers = playerData.slice(0, 15);
  const topFoulGrades = gradeData.slice(0, 15);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Players with Highest Foul Rates</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topFoulPlayers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="playerName" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                fontSize={10}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${Number(value).toFixed(2)}`, 'Fouls Per Game']}
                labelFormatter={(label) => `Player: ${label}`}
              />
              <Bar dataKey="foulsPerGame" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Grades with Most Fouls</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topFoulGrades}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="gradeName" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                fontSize={10}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${Number(value).toFixed(2)}`, 'Avg Fouls Per Game']}
                labelFormatter={(label) => `Grade: ${label}`}
              />
              <Bar dataKey="avgFoulsPerGame" fill="#ff6b6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Player Foul Distribution</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topFoulPlayers.map((player, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <span className="font-medium">{player.playerName}</span>
                  <span className="text-sm text-muted-foreground ml-2">({player.teamName})</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{player.foulsPerGame} FPG</div>
                  <div className="text-sm text-muted-foreground">{player.totalFouls} total fouls</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Grade Foul Summary</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topFoulGrades.map((grade, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                <div>
                  <span className="font-medium">{grade.gradeName}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{grade.avgFoulsPerGame} FPG</div>
                  <div className="text-sm text-muted-foreground">{grade.totalFouls} total fouls</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScoringEfficiencyChartProps {
  data: ScoringEfficiency[];
}

function ScoringEfficiencyChart({ data }: ScoringEfficiencyChartProps) {
  const gradeTypeEfficiency = data.reduce((acc, item) => {
    const existing = acc.find(g => g.gradeType === item.gradeType);
    if (existing) {
      existing.total1Point += item.total1Point;
      existing.total2Point += item.total2Point;
      existing.total3Point += item.total3Point;
    } else {
      acc.push({
        gradeType: item.gradeType,
        total1Point: item.total1Point,
        total2Point: item.total2Point,
        total3Point: item.total3Point
      });
    }
    return acc;
  }, [] as any[]);

  // Calculate percentages for grade type efficiency
  gradeTypeEfficiency.forEach(item => {
    const total = item.total1Point + item.total2Point + item.total3Point;
    item.percentage1Point = Math.round((item.total1Point / total) * 100);
    item.percentage2Point = Math.round((item.total2Point / total) * 100);
    item.percentage3Point = Math.round((item.total3Point / total) * 100);
  });

  const top20Grades = data.slice(0, 20);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Shot Type Distribution by Grade Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradeTypeEfficiency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="gradeType" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Bar dataKey="percentage1Point" stackId="a" fill="#8884d8" name="1-Point" />
              <Bar dataKey="percentage2Point" stackId="a" fill="#82ca9d" name="2-Point" />
              <Bar dataKey="percentage3Point" stackId="a" fill="#ffc658" name="3-Point" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4">Grade Type Shooting Preferences</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: '1-Point', value: gradeTypeEfficiency.reduce((sum, item) => sum + item.total1Point, 0) },
                  { name: '2-Point', value: gradeTypeEfficiency.reduce((sum, item) => sum + item.total2Point, 0) },
                  { name: '3-Point', value: gradeTypeEfficiency.reduce((sum, item) => sum + item.total3Point, 0) }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Total Shots']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="text-lg font-semibold mb-4">Top 20 Grades - Shot Type Breakdown</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top20Grades}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="gradeName" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
            <Bar dataKey="percentage1Point" stackId="a" fill="#8884d8" name="1-Point" />
            <Bar dataKey="percentage2Point" stackId="a" fill="#82ca9d" name="2-Point" />
            <Bar dataKey="percentage3Point" stackId="a" fill="#ffc658" name="3-Point" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'pace' | 'fouls' | 'efficiency'>('stats');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics data');
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coach's Corner</h1>
        <p className="text-muted-foreground">Deep dive into league analytics and trends</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <TabButton 
          isActive={activeTab === 'stats'} 
          onClick={() => setActiveTab('stats')}
        >
          Stat Distributions
        </TabButton>
        <TabButton 
          isActive={activeTab === 'pace'} 
          onClick={() => setActiveTab('pace')}
        >
          Pace Analysis
        </TabButton>
        <TabButton 
          isActive={activeTab === 'fouls'} 
          onClick={() => setActiveTab('fouls')}
        >
          Foul Analysis
        </TabButton>
        <TabButton 
          isActive={activeTab === 'efficiency'} 
          onClick={() => setActiveTab('efficiency')}
        >
          Scoring Efficiency
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && <StatsDistributionChart data={data.statsDistribution} />}
      {activeTab === 'pace' && <PaceAnalysisChart data={data.paceAnalysis} />}
      {activeTab === 'fouls' && <FoulAnalysisChart playerData={data.foulAnalysis.players} gradeData={data.foulAnalysis.grades} />}
      {activeTab === 'efficiency' && <ScoringEfficiencyChart data={data.scoringEfficiency} />}
    </div>
  );
}