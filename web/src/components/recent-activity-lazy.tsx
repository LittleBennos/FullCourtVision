"use client";

import { useState, useEffect } from "react";
import { RecentActivity } from "@/components/recent-activity";
import { RecentGame, FeaturedGame, WeeklyNumbers } from "@/lib/data";
import { Calendar, Loader2 } from "lucide-react";

interface RecentActivityData {
  games: RecentGame[];
  featuredGames: { closest: FeaturedGame | null; blowout: FeaturedGame | null };
  weeklyNumbers: WeeklyNumbers;
}

export function RecentActivityLazy() {
  const [data, setData] = useState<RecentActivityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Delay loading to improve initial LCP
    const timer = setTimeout(() => {
      setLoading(true);
      
      // Fetch data after initial page load
      fetch('/api/recent-activity')
        .then(res => res.json())
        .then((data: RecentActivityData) => {
          setData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load recent activity:', err);
          setLoading(false);
        });
    }, 100); // Small delay to let initial page render complete

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Recent Activity</h2>
          <p className="text-muted-foreground">
            Latest games and highlights from across Victorian basketball
          </p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading recent games...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Recent Activity</h2>
          <p className="text-muted-foreground">
            Latest games and highlights from across Victorian basketball
          </p>
        </div>
        
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Unable to load recent activity</p>
        </div>
      </section>
    );
  }

  return <RecentActivity {...data} />;
}