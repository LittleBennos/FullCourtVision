export type GlossaryCategory =
  | "core"
  | "shooting"
  | "advanced"
  | "archetypes"
  | "features";

export interface GlossaryEntry {
  id: string;
  term: string;
  abbr?: string;
  category: GlossaryCategory;
  definition: string;
  formula?: string;
  example?: string;
  seeItLink?: string;
  seeItLabel?: string;
}

export const CATEGORIES: { value: GlossaryCategory | "all"; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "📚" },
  { value: "core", label: "Core Stats", emoji: "📊" },
  { value: "shooting", label: "Shooting", emoji: "🏀" },
  { value: "advanced", label: "Advanced", emoji: "🧪" },
  { value: "archetypes", label: "Archetypes", emoji: "🎭" },
  { value: "features", label: "FCV Features", emoji: "⚡" },
];

export const GLOSSARY: GlossaryEntry[] = [
  // ── Core Stats ──
  {
    id: "ppg",
    term: "Points Per Game",
    abbr: "PPG",
    category: "core",
    definition:
      "The average number of points a player scores per game. The single most common measure of offensive output.",
    formula: "PPG = Total Points ÷ Games Played",
    example: "A player with 200 points in 20 games has a PPG of 10.0.",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "gp",
    term: "Games Played",
    abbr: "GP",
    category: "core",
    definition:
      "The total number of games in which a player appeared. Used as the denominator for all per-game averages and as a measure of availability and durability.",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "total-points",
    term: "Total Points",
    abbr: "PTS",
    category: "core",
    definition:
      "The cumulative number of points scored across all games. Combines free throws (1 pt), two-pointers (2 pts) and three-pointers (3 pts).",
    formula: "PTS = (1PT × 1) + (2PT × 2) + (3PT × 3)",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "fpg",
    term: "Fouls Per Game",
    abbr: "FPG",
    category: "core",
    definition:
      "Average personal fouls committed per game. High FPG may indicate an aggressive or physical playing style.",
    formula: "FPG = Total Fouls ÷ Games Played",
    seeItLink: "/fouls",
    seeItLabel: "Foul Analysis",
  },
  // ── Shooting ──
  {
    id: "1pt",
    term: "Free Throws Made",
    abbr: "1PT",
    category: "shooting",
    definition:
      "The number of successful free throws (worth 1 point each). In the PlayHQ data model this is recorded as one-point field goals.",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "2pt",
    term: "Two-Point Field Goals",
    abbr: "2PT",
    category: "shooting",
    definition:
      "The number of successful two-point field goals made from inside the three-point arc. Each is worth 2 points.",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "3pt",
    term: "Three-Point Field Goals",
    abbr: "3PT",
    category: "shooting",
    definition:
      "The number of successful three-point shots made from beyond the arc. Each is worth 3 points.",
    seeItLink: "/leaderboards",
    seeItLabel: "Leaderboards",
  },
  {
    id: "3pt-pg",
    term: "Three-Pointers Per Game",
    abbr: "3PG",
    category: "shooting",
    definition: "Average three-point field goals made per game.",
    formula: "3PG = Total 3PT ÷ Games Played",
  },
  {
    id: "2pt-pg",
    term: "Two-Pointers Per Game",
    abbr: "2PG",
    category: "shooting",
    definition: "Average two-point field goals made per game.",
    formula: "2PG = Total 2PT ÷ Games Played",
  },
  {
    id: "shooting-profile",
    term: "Shooting Profile",
    abbr: undefined,
    category: "shooting",
    definition:
      "A breakdown of a player's scoring by shot type (1PT, 2PT, 3PT) shown as percentages. Helps identify whether a player is an inside scorer, perimeter shooter, or balanced scorer.",
    seeItLink: "/players",
    seeItLabel: "Any player page",
  },
  // ── Advanced ──
  {
    id: "scoring-efficiency",
    term: "Scoring Efficiency",
    category: "advanced",
    definition:
      "A composite measure of how efficiently a player converts opportunities into points, considering their PPG relative to games played and shot distribution. Players who score more points on fewer games with a balanced shot profile are rated higher.",
  },
  {
    id: "season-progression",
    term: "Season Progression",
    category: "advanced",
    definition:
      "A chart tracking how a player's per-game averages change across seasons, revealing improvement trends or declines over time.",
    seeItLink: "/players",
    seeItLabel: "Any player page",
  },
  {
    id: "performance-trends",
    term: "Performance Trends",
    category: "advanced",
    definition:
      "Game-by-game scoring visualisation that shows variance, hot streaks, and consistency within a single season.",
    seeItLink: "/players",
    seeItLabel: "Any player page",
  },
  // ── Archetypes ──
  {
    id: "archetype",
    term: "Player Archetype",
    category: "archetypes",
    definition:
      "A label assigned to each player based on their statistical profile. Archetypes summarise playing style at a glance. Calculated from PPG, 3PG, 2PG, and FPG using threshold-based rules.",
    seeItLink: "/players",
    seeItLabel: "Any player page",
  },
  {
    id: "arch-sharpshooter",
    term: "Sharpshooter",
    category: "archetypes",
    definition:
      "A player who relies heavily on three-point shooting. Assigned when 3PG ≥ 2 and 3PG > 2PG × 0.6, indicating strong perimeter dependence.",
    formula: "3PG ≥ 2 AND 3PG > 2PG × 0.6",
    example: "A player averaging 2.5 three-pointers and 3.0 two-pointers per game qualifies (2.5 > 3.0 × 0.6 = 1.8).",
  },
  {
    id: "arch-inside-scorer",
    term: "Inside Scorer",
    category: "archetypes",
    definition:
      "A player who scores primarily from two-point range. Assigned when 2PG ≥ 3 and 2PG > 3PG × 2.",
    formula: "2PG ≥ 3 AND 2PG > 3PG × 2",
  },
  {
    id: "arch-high-volume",
    term: "High Volume",
    category: "archetypes",
    definition:
      "A dominant scorer averaging 15+ PPG. This is the highest-priority archetype — if PPG ≥ 15 the player is always classified as High Volume regardless of shot distribution.",
    formula: "PPG ≥ 15",
  },
  {
    id: "arch-physical",
    term: "Physical",
    category: "archetypes",
    definition:
      "A player with a high foul rate, suggesting an aggressive, physical playing style. Assigned when FPG ≥ 3, or when FPG ≥ 2 and PPG < 8.",
    formula: "FPG ≥ 3  OR  (FPG ≥ 2 AND PPG < 8)",
  },
  {
    id: "arch-balanced",
    term: "Balanced",
    category: "archetypes",
    definition:
      "The default archetype for players who don't meet any specialist threshold. These players have a well-rounded statistical profile.",
  },
  // ── FCV Features ──
  {
    id: "rising-stars",
    term: "Rising Stars",
    category: "features",
    definition:
      "Players showing the biggest PPG improvement between their most recent and previous seasons. The algorithm compares consecutive seasons where a player has played a minimum number of games in each, then ranks by absolute PPG improvement.",
    formula: "Improvement = Current Season PPG − Previous Season PPG",
    seeItLink: "/rising-stars",
    seeItLabel: "Rising Stars",
  },
  {
    id: "anomaly-detection",
    term: "Anomaly Detection",
    category: "features",
    definition:
      "An automated system that flags players with unusual statistical patterns. Each anomaly has a severity level (Notable, Rare, Legendary) and includes types like Ironman (high games played), Scoring Spike (sudden improvement), Sniper (three-point specialist), Volume Scorer, and Consistent Performer.",
    seeItLink: "/anomalies",
    seeItLabel: "Anomaly Leaderboard",
  },
  {
    id: "milestones",
    term: "Milestones",
    category: "features",
    definition:
      "Achievement markers for career totals — e.g. 100 points, 50 games, 25 three-pointers. Shown on a player's profile as a timeline of reached and upcoming milestones.",
    seeItLink: "/players",
    seeItLabel: "Any player page",
  },
  {
    id: "chemistry-score",
    term: "Team Chemistry Score",
    category: "features",
    definition:
      "A composite metric measuring how well a team's players complement each other based on archetype diversity, scoring distribution, and lineup balance. Displayed as a 0–100 score with a radar chart breakdown.",
    seeItLink: "/teams",
    seeItLabel: "Any team → Chemistry tab",
  },
  {
    id: "player-grades",
    term: "Player Grades",
    category: "features",
    definition:
      "Letter grades (A+ through F) assigned to players based on their statistical performance relative to peers in the same competition grade. Enables cross-grade comparison.",
    seeItLink: "/grades",
    seeItLabel: "Grades",
  },
  {
    id: "mock-draft",
    term: "Mock Draft",
    category: "features",
    definition:
      "A simulated draft board ranking players by overall performance, useful for coaches evaluating talent across different competitions and grades.",
    seeItLink: "/draft",
    seeItLabel: "Mock Draft",
  },
  {
    id: "head-to-head",
    term: "Head-to-Head Comparison",
    category: "features",
    definition:
      "Side-by-side statistical comparison of two players across all shared and individual metrics, with visual charts highlighting differences.",
    seeItLink: "/compare",
    seeItLabel: "Compare Players",
  },
  {
    id: "heatmap",
    term: "Team Heatmap",
    category: "features",
    definition:
      "A geographic visualisation showing organisation locations across Victoria, with colour intensity representing the concentration of teams and players.",
    seeItLink: "/heatmap",
    seeItLabel: "Heatmap",
  },
];
