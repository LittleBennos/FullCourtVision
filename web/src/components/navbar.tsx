"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, Trophy, BarChart3, Search, Menu, X, ArrowLeftRight, Building2, TrendingUp, MapPin } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Activity },
  { href: "/organisations", label: "Organisations", icon: Building2 },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/leaderboards", label: "Leaderboards", icon: BarChart3 },
  { href: "/rising-stars", label: "Rising Stars", icon: TrendingUp },
  { href: "/heatmap", label: "Heatmap", icon: MapPin },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/search", label: "Search", icon: Search },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline">FullCourtVision</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                pathname.startsWith(href)
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
