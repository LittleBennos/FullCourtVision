import Link from "next/link";
import { Users, Trophy, Building2 } from "lucide-react";

export default function QuickLinksInner() {
  const links = [
    { 
      href: "/players", 
      title: "Player Directory", 
      desc: "Search and filter all tracked players", 
      icon: Users 
    },
    { 
      href: "/leaderboards", 
      title: "Leaderboards", 
      desc: "Top scorers, most games, best shooters", 
      icon: Trophy 
    },
    { 
      href: "/teams", 
      title: "Team Directory", 
      desc: "Browse teams and their records", 
      icon: Building2 
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 mb-16">
      <h2 className="text-2xl font-bold mb-6">Explore</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {links.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors"
          >
            <Icon className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold mb-1 group-hover:text-accent transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}