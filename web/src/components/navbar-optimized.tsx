"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, Calendar, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./theme-toggle";
import dynamic from "next/dynamic";

// Lazy load non-critical navbar components
const GlobalSearch = dynamic(() => import("./global-search").then(m => ({ default: m.GlobalSearch })), {
  ssr: false,
});

const DataFreshnessBadge = dynamic(() => import("./data-freshness-badge").then(m => ({ default: m.DataFreshnessBadge })), {
  ssr: false,
});

// Simplified primary navigation for LCP optimization
const primaryLinks = [
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Activity },
  { href: "/games", label: "Games", icon: Calendar },
];

export function NavbarOptimized() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav 
      ref={navRef}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ contain: 'layout style' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 font-semibold text-lg hover:text-accent transition-colors"
          >
            <Activity className="w-5 h-5 text-accent" />
            <span className="hidden sm:inline">FullCourtVision</span>
            <span className="sm:hidden">FCV</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {primaryLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side - critical elements only initially */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <GlobalSearch />
            </div>
            <ThemeToggle />
            <div className="hidden lg:block">
              <DataFreshnessBadge />
            </div>
            
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col gap-2">
              {primaryLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="px-3">
                  <GlobalSearch />
                </div>
                <div className="mt-2 px-3">
                  <DataFreshnessBadge />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}