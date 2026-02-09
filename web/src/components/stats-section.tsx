"use client";

import { useState, useEffect } from "react";
import { Users, Gamepad2, Building2, Trophy } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export interface Stats {
  players: number;
  games: number;
  organisations: number;
  competitions: number;
}

interface StatsSectionProps {
  initialStats?: Stats;
}

// Fallback stats for immediate display
const FALLBACK_STATS: Stats = {
  players: 57000,
  games: 89000,
  organisations: 150,
  competitions: 50,
};

export function StatsSection({ initialStats = FALLBACK_STATS }: StatsSectionProps) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isLoading, setIsLoading] = useState(!initialStats);

  useEffect(() => {
    // Only fetch if we don't have initial stats
    if (initialStats !== FALLBACK_STATS) return;

    const timer = setTimeout(() => {
      fetch('/api/stats')
        .then(res => res.json())
        .then((data: Stats) => {
          setStats(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load stats:', err);
          setIsLoading(false);
        });
    }, 100); // Small delay to prioritize LCP

    return () => clearTimeout(timer);
  }, [initialStats]);

  return (
    <section className="max-w-7xl mx-auto px-4 -mt-8 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Players" 
          value={isLoading ? "Loading..." : stats.players} 
          icon={Users} 
        />
        <StatCard 
          label="Games" 
          value={isLoading ? "Loading..." : stats.games} 
          icon={Gamepad2} 
        />
        <StatCard 
          label="Organisations" 
          value={isLoading ? "Loading..." : stats.organisations} 
          icon={Building2} 
        />
        <StatCard 
          label="Competitions" 
          value={isLoading ? "Loading..." : stats.competitions} 
          icon={Trophy} 
        />
      </div>
    </section>
  );
}