<p align="center">
  <img src="public/fcv-logo.png" alt="FullCourtVision" width="120" />
</p>

<h1 align="center">🏀 FullCourtVision</h1>

<p align="center">
  <strong>The ultimate analytics platform for Basketball Victoria — turning raw box scores into actionable insights.</strong>
</p>

<p align="center">
  <a href="https://fullcourtvision.vercel.app"><img src="https://img.shields.io/badge/🌐_Live-fullcourtvision.vercel.app-black?style=for-the-badge" alt="Live Site" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Recharts-2-FF6384?style=flat-square" alt="Recharts" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=flat-square&logo=vercel" alt="Vercel" />
</p>

---

## 📊 At a Glance

| Metric | Count |
|--------|-------|
| **Players** | 57,735 |
| **Stat Lines** | 380,815 |
| **Games** | 89,823 |
| **Source** | Basketball Victoria (PlayHQ) |

---

## ✨ Features

### 🧑‍🤝‍🧑 Player Profiles & Archetype Badges
Every player gets a rich profile page with career stats, game logs, and an algorithmically-assigned **archetype badge** — *Sharpshooter*, *Inside Scorer*, *Playmaker*, *Glass Cleaner*, *Two-Way Threat*, and more — based on statistical tendencies.

### 🏆 Leaderboards
Filterable leaderboards across every stat category with **season-by-season filtering**. Find the top scorers, rebounders, and assist leaders for any competition or year.

### 👥 Team Pages
Full team pages with **rosters**, **schedules**, **results**, and aggregated team stats.

### 🏢 Organisation Analytics Dashboards
Organisation-level dashboards showing performance across all teams, seasons, and competitions within a club.

### ⚖️ Player Comparison Tool
Side-by-side player comparison with radar charts and stat breakdowns. Compare any two players across every metric.

### 🌟 Rising Stars Algorithm
A proprietary algorithm that identifies **breakout players** — athletes showing the steepest improvement trajectories across seasons.

### 🗺️ Activity Heatmap
Geographic heatmap visualising basketball activity density across Victoria.

### 🧠 Coach's Corner Analytics
Advanced analytics views designed for coaches — efficiency ratings, lineup analysis, and tactical insights.

### 🔮 Game Predictions
A statistical model that predicts game outcomes based on historical team and player performance.

### 🎮 Fantasy League Simulator
Build fantasy rosters with salary caps, draft players, and simulate matchups using real statistical data.

### 🏅 Hall of Fame & Records
All-time records, milestone tracking, and a Hall of Fame celebrating the best performers in Basketball Victoria history.

### 🔍 Global Search (⌘K)
Lightning-fast command palette search — find any player, team, or organisation instantly.

### 🌙 Dark Mode
Full dark mode support with system preference detection.

### 📱 PWA Support
Install FullCourtVision as a native app on any device. Works offline for previously-viewed pages.

### 📤 Social Sharing & Export
Export stat cards and comparisons as images. Share player profiles directly to social media.

### 📦 And More...
All-Stars selections · Draft board · Clutch stats · Availability tracker · Matchup analyzer · Player grades · Conference standings · Scouting reports · Game planning tools · Statistical anomaly detection · Career timelines · Glossary

---

## 📸 Screenshots

> Screenshots coming soon — the app is live at [fullcourtvision.vercel.app](https://fullcourtvision.vercel.app)

<!--
<p align="center">
  <img src="docs/screenshots/home.png" width="400" />
  <img src="docs/screenshots/player-profile.png" width="400" />
  <img src="docs/screenshots/leaderboards.png" width="400" />
  <img src="docs/screenshots/comparison.png" width="400" />
</p>
-->

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Testing** | Vitest + Playwright |
| **Deployment** | [Vercel](https://vercel.com/) |
| **PWA** | Custom service worker |

---

## 🗂️ Project Structure

```
web/
├── public/                  # Static assets & PWA icons
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── players/         # Player profiles & listings
│   │   ├── teams/           # Team pages
│   │   ├── organisations/   # Organisation dashboards
│   │   ├── leaderboards/    # Stat leaderboards
│   │   ├── compare/         # Player comparison tool
│   │   ├── rising-stars/    # Rising stars algorithm
│   │   ├── heatmap/         # Activity heatmap
│   │   ├── predictions/     # Game prediction model
│   │   ├── fantasy/         # Fantasy league simulator
│   │   ├── hall-of-fame/    # Records & Hall of Fame
│   │   ├── analytics/       # Coach's Corner analytics
│   │   ├── games/           # Game results & details
│   │   ├── search/          # Search page
│   │   ├── api/             # API routes
│   │   └── ...              # 30+ more feature routes
│   ├── components/          # Shared UI components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utilities & Supabase client
├── tests/                   # Playwright E2E tests
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **pnpm**

### Installation

```bash
git clone https://github.com/LittleBennos/FullCourtVision.git
cd FullCourtVision/web
npm install
```

### Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

---

## 🔄 Data Pipeline

```
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│   PlayHQ     │────▶│  SQLite   │────▶│ Supabase  │────▶│ Next.js  │
│  (Scraper)   │     │ (Staging) │     │(PostgreSQL)│    │  (Web)   │
└──────────────┘     └──────────┘     └───────────┘     └──────────┘
```

1. **PlayHQ Scraper** — Python scraper extracts game results, box scores, and player data from Basketball Victoria's PlayHQ platform
2. **SQLite Staging** — Raw data is cleaned, normalised, and staged in a local SQLite database
3. **Supabase** — Cleaned data is pushed to Supabase PostgreSQL with optimised indexes and RLS policies
4. **Next.js** — The web app queries Supabase in real-time via the client SDK, with ISR caching for performance

---

## ☁️ Deployment

The app is deployed on **Vercel** with automatic deployments from the `main` branch.

```bash
npm i -g vercel
vercel --prod
```

Environment variables are configured in the Vercel dashboard.

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npx playwright test
```

---

## 👤 Author

**Ben Giosis** — Software Engineer

- GitHub: [@LittleBennos](https://github.com/LittleBennos)
- Email: bengiosis@gmail.com

---

## 📄 License

This project is for portfolio/demonstration purposes. Data sourced from Basketball Victoria via PlayHQ.

---

<p align="center">
  <sub>Built with ❤️ and a lot of basketball data</sub>
</p>
