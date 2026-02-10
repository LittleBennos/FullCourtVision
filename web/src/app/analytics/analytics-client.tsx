"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import type { AnalyticsData } from "../api/analytics/route";

// Dynamically import the analytics charts to reduce initial bundle size
const AnalyticsChartsContainer = dynamic(() => 
  import('@/components/analytics/analytics-charts').then(mod => ({ default: mod.AnalyticsChartsContainer })), {
  loading: () => (
    <div className="space-y-6">
      <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Loading charts...</div>
      </div>
    </div>
  ),
  ssr: false
});

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
      <Suspense fallback={
        <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground">Loading charts...</div>
        </div>
      }>
        <AnalyticsChartsContainer activeTab={activeTab} data={data} />
      </Suspense>
    </div>
  );
}