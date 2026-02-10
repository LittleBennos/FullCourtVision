"use client";

import dynamic from 'next/dynamic';

// Create a centralized dynamic import system for all Recharts components
// This ensures they're only loaded when needed and not bundled in the main chunk

const ChartLoadingFallback = ({ height = 300 }: { height?: number }) => (
  <div 
    className="bg-muted/50 rounded animate-pulse flex items-center justify-center" 
    style={{ height: `${height}px` }}
  >
    <div className="text-muted-foreground text-sm">Loading chart...</div>
  </div>
);

export const ResponsiveContainer = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), {
  loading: () => <ChartLoadingFallback />,
  ssr: false
});

export const BarChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.BarChart })), {
  loading: () => <ChartLoadingFallback />,
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
  loading: () => <ChartLoadingFallback />,
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

export const LineChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.LineChart })), {
  loading: () => <ChartLoadingFallback />,
  ssr: false
});

export const Line = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Line })), {
  ssr: false
});

export const AreaChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.AreaChart })), {
  loading: () => <ChartLoadingFallback />,
  ssr: false
});

export const Area = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Area })), {
  ssr: false
});

export const ComposedChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.ComposedChart })), {
  loading: () => <ChartLoadingFallback />,
  ssr: false
});

export const Legend = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Legend })), {
  ssr: false
});

export const ReferenceDot = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.ReferenceDot })), {
  ssr: false
});

export const RadarChart = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.RadarChart })), {
  loading: () => <ChartLoadingFallback />,
  ssr: false
});

export const PolarGrid = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.PolarGrid })), {
  ssr: false
});

export const PolarAngleAxis = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.PolarAngleAxis })), {
  ssr: false
});

export const PolarRadiusAxis = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.PolarRadiusAxis })), {
  ssr: false
});

export const Radar = dynamic(() => 
  import('recharts').then(mod => ({ default: mod.Radar })), {
  ssr: false
});