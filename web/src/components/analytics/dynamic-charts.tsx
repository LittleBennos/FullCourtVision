"use client";

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Dynamically import chart components to reduce initial bundle size
export const ResponsiveContainer = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), {
  loading: () => <div className="h-[300px] bg-muted/50 rounded animate-pulse" />,
  ssr: false
});

export const BarChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.BarChart })), {
  loading: () => <div className="h-[300px] bg-muted/50 rounded animate-pulse" />,
  ssr: false
});

export const Bar = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Bar })), {
  ssr: false
});

export const XAxis = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.XAxis })), {
  ssr: false
});

export const YAxis = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.YAxis })), {
  ssr: false
});

export const CartesianGrid = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.CartesianGrid })), {
  ssr: false
});

export const Tooltip = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Tooltip })), {
  ssr: false
});

export const PieChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.PieChart })), {
  loading: () => <div className="h-[300px] bg-muted/50 rounded animate-pulse" />,
  ssr: false
});

export const Pie = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Pie })), {
  ssr: false
});

export const Cell = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Cell })), {
  ssr: false
});

// Create a dynamic analytics component wrapper
export const DynamicAnalyticsCharts = dynamic(() => 
  import('./analytics-charts').then(mod => ({ default: mod.AnalyticsChartsContainer })), {
  loading: () => (
    <div className="space-y-6">
      <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse" />
      <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse" />
      <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse" />
    </div>
  ),
  ssr: false
});