"use client";

import dynamic from "next/dynamic";
import { Users, Trophy, Building2 } from "lucide-react";

function QuickLinksSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 mb-16">
      <h2 className="text-2xl font-bold mb-6">Explore</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded mb-3" />
            <div className="h-5 bg-muted rounded mb-2 w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

const QuickLinksInner = dynamic(
  () => import("./quick-links-inner"),
  { 
    loading: () => <QuickLinksSkeleton />,
    ssr: false 
  }
);

export function QuickLinksLazy() {
  return <QuickLinksInner />;
}