import Link from "next/link";

const navLinks = [
  { href: "/players", label: "Players" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/teams", label: "Teams" },
  { href: "/organisations", label: "Organisations" },
  { href: "/games", label: "Games" },
  { href: "/about", label: "About" },
];

const moreLinks = [
  { href: "/competitions", label: "Competitions" },
  { href: "/grades", label: "Grades" },
  { href: "/awards", label: "Awards" },
  { href: "/rising-stars", label: "Rising Stars" },
  { href: "/compare", label: "Compare" },
  { href: "/analytics", label: "Coach's Corner" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Top section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-lg hover:text-blue-400 transition-colors">
              <span className="text-2xl">🏀</span>
              FullCourtVision
            </Link>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-xs">
              Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com/LittleBennos/FullCourtVision"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Quick Links</h2>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Explore</h2>
            <ul className="space-y-2">
              {moreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tech & Data */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Built With</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {["Next.js", "Supabase", "PlayHQ"].map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-blue-400 border border-slate-700"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-500 leading-relaxed">
                📡 Data sourced from{" "}
                <a
                  href="https://www.playhq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  PlayHQ
                </a>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Last updated February 2025
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} FullCourtVision. Not affiliated with Basketball Victoria.
          </p>
          <p className="text-xs text-slate-500">
            Built by{" "}
            <span className="text-slate-300 font-medium">Ben Giosis</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
