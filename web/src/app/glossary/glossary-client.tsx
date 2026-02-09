"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, BookOpen, ExternalLink, ChevronDown, Calculator, BarChart3 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GLOSSARY, CATEGORIES, type GlossaryCategory, type GlossaryEntry } from "./glossary-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

// ── Interactive Calculator ──

interface PlayerSample {
  id: string;
  first_name: string;
  last_name: string;
  games_played: number;
  total_points: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
}

function InteractiveExample() {
  const [player, setPlayer] = useState<PlayerSample | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/glossary/sample-player")
      .then((r) => r.json())
      .then((d) => setPlayer(d.player ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading a sample player…</p>
      </div>
    );
  }

  if (!player) return null;

  const ppg = player.games_played > 0 ? player.total_points / player.games_played : 0;
  const fpg = player.games_played > 0 ? player.total_fouls / player.games_played : 0;
  const threePg = player.games_played > 0 ? player.three_point / player.games_played : 0;
  const twoPg = player.games_played > 0 ? player.two_point / player.games_played : 0;

  const shotData = [
    { name: "Free Throws (1PT)", value: player.one_point, color: "#60a5fa" },
    { name: "Two-Pointers (2PT)", value: player.two_point, color: "#f59e0b" },
    { name: "Three-Pointers (3PT)", value: player.three_point, color: "#10b981" },
  ];

  const perGameData = [
    { name: "PPG", value: +ppg.toFixed(1) },
    { name: "FPG", value: +fpg.toFixed(1) },
    { name: "3PG", value: +threePg.toFixed(1) },
    { name: "2PG", value: +twoPg.toFixed(1) },
  ];

  // Compute archetype
  let archetype = "Balanced";
  if (ppg >= 15) archetype = "High Volume";
  else if (threePg >= 2 && threePg > twoPg * 0.6) archetype = "Sharpshooter";
  else if (fpg >= 3 || (fpg >= 2 && ppg < 8)) archetype = "Physical";
  else if (twoPg >= 3 && twoPg > threePg * 2) archetype = "Inside Scorer";

  const pointsFromOne = player.one_point * 1;
  const pointsFromTwo = player.two_point * 2;
  const pointsFromThree = player.three_point * 3;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-accent/5">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold">Interactive Example</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          See how stats are calculated for a real player from the database.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Player header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href={`/players/${player.id}`} className="text-xl font-bold hover:text-accent transition-colors">
              {player.first_name} {player.last_name}
            </Link>
            <p className="text-sm text-muted-foreground mt-0.5">
              {player.games_played} games · {player.total_points} total points
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-accent/15 text-accent border border-accent/30">
            {archetype}
          </span>
        </div>

        {/* Calculation walkthrough */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-accent" /> Points Breakdown
            </h4>
            <div className="font-mono text-sm space-y-1 text-muted-foreground">
              <p>Free throws:  {player.one_point} × 1 = <span className="text-blue-400">{pointsFromOne}</span></p>
              <p>Two-pointers: {player.two_point} × 2 = <span className="text-amber-400">{pointsFromTwo}</span></p>
              <p>Three-pointers: {player.three_point} × 3 = <span className="text-emerald-400">{pointsFromThree}</span></p>
              <hr className="border-border" />
              <p className="text-foreground font-semibold">
                Total = {pointsFromOne} + {pointsFromTwo} + {pointsFromThree} = {player.total_points} pts
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <h4 className="font-semibold text-sm">Per-Game Averages</h4>
            <div className="font-mono text-sm space-y-1 text-muted-foreground">
              <p>PPG = {player.total_points} ÷ {player.games_played} = <span className="text-accent font-semibold">{ppg.toFixed(1)}</span></p>
              <p>FPG = {player.total_fouls} ÷ {player.games_played} = <span className="text-foreground">{fpg.toFixed(1)}</span></p>
              <p>3PG = {player.three_point} ÷ {player.games_played} = <span className="text-foreground">{threePg.toFixed(1)}</span></p>
              <p>2PG = {player.two_point} ÷ {player.games_played} = <span className="text-foreground">{twoPg.toFixed(1)}</span></p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="font-semibold text-sm mb-3">Shot Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={shotData.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  strokeWidth={0}
                  label={(props: any) => `${(props.name ?? "").split(" ")[0]} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {shotData.filter((d) => d.value > 0).map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Per-Game Averages</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perGameData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {perGameData.map((_, i) => (
                    <Cell key={i} fill={["#f59e0b", "#ef4444", "#10b981", "#60a5fa"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="text-center">
          <Link
            href={`/players/${player.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            View full profile <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Glossary Entry Card ──

function EntryCard({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES.find((c) => c.value === entry.category);

  return (
    <div
      id={entry.id}
      className="rounded-xl border border-border bg-card hover:border-accent/30 transition-colors scroll-mt-24"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <span className="text-lg mt-0.5">{cat?.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold">{entry.term}</h3>
            {entry.abbr && (
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-mono font-semibold">
                {entry.abbr}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {entry.definition}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pl-12 space-y-3">
          <p className="text-sm text-muted-foreground">{entry.definition}</p>

          {entry.formula && (
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formula</span>
              <p className="font-mono text-sm text-foreground mt-1">{entry.formula}</p>
            </div>
          )}

          {entry.example && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 px-4 py-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">Example</span>
              <p className="text-sm text-muted-foreground mt-1">{entry.example}</p>
            </div>
          )}

          {entry.seeItLink && (
            <Link
              href={entry.seeItLink}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              See it in action → {entry.seeItLabel} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Client ──

export function GlossaryClient() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return GLOSSARY.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.term.toLowerCase().includes(q) ||
        (e.abbr?.toLowerCase().includes(q) ?? false) ||
        e.definition.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Stats Glossary" }]} />

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-2">
          <BookOpen className="w-4 h-4" />
          Learn
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Stats Glossary</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Everything you need to understand the numbers behind FullCourtVision — from basic box-score stats to FCV-exclusive features.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stats, terms, abbreviations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                category === c.value
                  ? "bg-accent text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {GLOSSARY.length} terms
        {search && <> matching &quot;{search}&quot;</>}
      </p>

      {/* Entries */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No terms found. Try a different search or category.</p>
          </div>
        ) : (
          filtered.map((e) => <EntryCard key={e.id} entry={e} />)
        )}
      </div>

      {/* Interactive Example */}
      <div className="pt-4">
        <InteractiveExample />
      </div>
    </div>
  );
}
