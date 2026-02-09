"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, Trophy, BarChart3, Menu, X, ArrowLeftRight, Building2, TrendingUp, MapPin, Target, ChevronDown, Calendar, Award, PieChart, Info, Heart, Sparkles, Star, ClipboardList, Swords, Shield, Clock, BookOpen, Flame, Gamepad2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";
import { DataFreshnessBadge } from "./data-freshness-badge";
import { useFavourites } from "@/hooks/useFavourites";
import { useWhatsNewCount } from "@/hooks/useWhatsNewCount";

const primaryLinks = [
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Activity },
  { href: "/games", label: "Games", icon: Calendar },
];

const moreLinks = [
  { href: "/rankings", label: "Rankings", icon: TrendingUp },
  { href: "/leaderboards", label: "Leaderboards", icon: BarChart3 },
  { href: "/analytics", label: "Coach's Corner", icon: PieChart },
  { href: "/conferences", label: "Standings", icon: Trophy },
  { href: "/organisations", label: "Organisations", icon: Building2 },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/grades", label: "Grades", icon: Target },
  { href: "/awards", label: "Awards", icon: Award },
  { href: "/rising-stars", label: "Rising Stars", icon: TrendingUp },
  { href: "/heatmap", label: "Heatmap", icon: MapPin },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/all-stars", label: "All-Star Team", icon: Star },
  { href: "/draft", label: "Mock Draft", icon: Sparkles },
  { href: "/roster-builder", label: "Roster Builder", icon: ClipboardList },
  { href: "/matchup", label: "Matchup Predictor", icon: Swords },
  { href: "/timeline", label: "Season Timeline", icon: Clock },
  { href: "/availability", label: "Availability", icon: Shield },
  { href: "/clutch", label: "Clutch", icon: Flame },
  { href: "/fantasy", label: "Fantasy", icon: Gamepad2 },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: Trophy },
  { href: "/glossary", label: "Learn", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
];

const allLinks = [...primaryLinks, ...moreLinks];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { totalCount } = useFavourites();
  const whatsNewCount = useWhatsNewCount();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMoreActive = moreLinks.some((l) => pathname.startsWith(l.href));

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl" aria-label="FullCourtVision home">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline">FullCourtVision</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {primaryLinks.map(({ href, label, icon: Icon }) => (
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

          {/* More dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isMoreActive
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              More
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                {moreLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      pathname.startsWith(href)
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search and Mobile toggle */}
        <div className="flex items-center gap-2">
          <DataFreshnessBadge variant="dot" />
          <Link
            href="/favourites"
            className={`relative p-2 rounded-lg transition-colors ${
              pathname === "/favourites"
                ? "bg-accent text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            aria-label="Favourites"
            title="Favourites"
          >
            <Heart className="w-5 h-5" />
            {whatsNewCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                {whatsNewCount}
              </span>
            ) : totalCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-400 text-white text-[10px] font-bold rounded-full px-1">
                {totalCount}
              </span>
            ) : null}
          </Link>
          <GlobalSearch />
          <ThemeToggle />
          <button className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-2">
          {allLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] ${
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
