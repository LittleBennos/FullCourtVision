# 🏀 FullCourtVision

**The most comprehensive Victorian basketball analytics platform.**

Tracking **58,000+ players**, **380,000+ stat lines**, and **90,000+ games** scraped from PlayHQ — all searchable, visualised, and available via a public API.

🔗 **[fullcourtvision.vercel.app](https://fullcourtvision.vercel.app)**

---

## ✨ Features

| Feature | Description |
|---|---|
| **Player Profiles** | Career stats, season-by-season breakdowns, and trend charts for every player |
| **Team Pages** | Rosters, win/loss records, and team performance summaries |
| **Organisation Pages** | Browse all clubs and associations across Victoria |
| **Leaderboards** | Top players by PPG, total points, games played, three-pointers, and more |
| **Rising Stars** | Surface breakout players with the biggest stat jumps |
| **Scoring Heatmap** | Visual heatmap of scoring output across competitions |
| **Player Comparison** | Side-by-side stat comparison between any two players |
| **Unified Search** | Instant search across players, teams, and organisations |
| **Grade Pages** | Drill into specific competition grades and divisions |
| **Trend Charts** | Recharts-powered interactive visualisations of stat trends over time |
| **Public API** | 8 RESTful JSON endpoints for programmatic access |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (React 19, App Router) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Charts** | [Recharts 3](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Testing** | [Playwright](https://playwright.dev/) (E2E) · [Vitest](https://vitest.dev/) (Unit) |
| **Scraping** | Node.js + PlayHQ GraphQL API |
| **Analysis** | Python · scikit-learn · Streamlit |
| **Hosting** | [Vercel](https://vercel.com/) |

---

## 📡 API Reference

Base URL: `https://fullcourtvision.vercel.app/api`

All endpoints return JSON with CORS enabled.

| Endpoint | Description | Key Params |
|---|---|---|
| `GET /api` | API index & documentation | — |
| `GET /api/players` | Search and list players | `search`, `limit` (max 100), `offset` |
| `GET /api/players/:id` | Player profile with career stats | — |
| `GET /api/players/:id/stats` | Season-by-season detailed stats | — |
| `GET /api/teams` | Search and list teams | `search`, `org`, `limit` |
| `GET /api/teams/:id` | Team details with roster and record | — |
| `GET /api/leaderboards` | Top players by stat category | `stat` (ppg\|points\|games\|threes), `season`, `limit` |
| `GET /api/organisations` | List all organisations | — |
| `GET /api/search` | Unified search across all entities | `q` (min 2 chars), `limit` (max 20) |

### Example

```bash
# Search for a player
curl "https://fullcourtvision.vercel.app/api/players?search=smith&limit=5"

# Get leaderboard
curl "https://fullcourtvision.vercel.app/api/leaderboards?stat=ppg&limit=10"
```

---

## 🔄 Data Pipeline

```
PlayHQ GraphQL API  →  Node.js Scraper  →  SQLite  →  Supabase (PostgreSQL)
```

### Scraper (`/scraper`)

The data pipeline scrapes the PlayHQ GraphQL API to collect player stats, team rosters, game results, and organisation data across Victorian basketball competitions.

- **`playhq-scraper.js`** — Core scraper with GraphQL query logic
- **`playhq-db.js`** — SQLite database layer for local storage
- **`victoria-wide-scrape.js`** — Full Victoria-wide data collection
- **`edjba-full-scrape.js`** — EDJBA-specific deep scrape
- **`edjba-fixtures-scrape.js`** — Fixtures and schedule data

### Export (`/scripts`)

Export scripts transform and load data from local SQLite into Supabase:

- **`export_for_web.py`** — Main export pipeline: SQLite → Supabase
- **`export_data.py`** — Supplementary data export utilities

---

## 📊 Analysis (`/analysis`)

Python-based statistical analysis suite for deeper insights:

| Module | Purpose |
|---|---|
| `clustering.py` | K-Means clustering to group players by statistical profile |
| `predictions.py` | Random Forest models for performance prediction |
| `player_analysis.py` | Individual player statistical analysis |
| `team_analysis.py` | Team-level performance analysis |
| `data_loader.py` | Shared data loading utilities |

### Streamlit Dashboard

An interactive Streamlit dashboard (`streamlit_app.py`) provides visual exploration of clustering results, prediction models, and player comparisons.

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

**Python dependencies:** pandas, numpy, scikit-learn, scipy, matplotlib, seaborn, plotly, streamlit

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Local Development

```bash
# Clone the repo
git clone https://github.com/LittleBennos/FullCourtVision.git
cd FullCourtVision/web

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your Supabase URL and anon key

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

---

## 🧪 Testing

**365 tests** across **5 browser targets** using Playwright.

### Browser Matrix

| Browser | Engine |
|---|---|
| Desktop Chrome | Chromium |
| Desktop Firefox | Firefox |
| Desktop Safari | WebKit |
| Mobile Chrome | Pixel 5 (Chromium) |
| Mobile Safari | iPhone 12 (WebKit) |

### Test Suites

| Suite | Coverage |
|---|---|
| `page-loads.spec.ts` | All pages render correctly |
| `api-routes.spec.ts` | API endpoint responses and schemas |
| `user-flows.spec.ts` | Search, navigation, comparison workflows |
| `dynamic-routes.spec.ts` | Player/team/org dynamic pages |
| `seo.spec.ts` | Meta tags, Open Graph, structured data |
| `edge-cases.spec.ts` | Error handling, 404s, invalid inputs |

### Running Tests

```bash
cd web

# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed

# View HTML report
npm run test:e2e:report

# Run unit tests
npm test
```

---

## 📁 Project Structure

```
FullCourtVision/
├── web/                    # Next.js 16 web application
│   ├── src/app/           
│   │   ├── api/            # REST API routes
│   │   ├── players/        # Player pages
│   │   ├── teams/          # Team pages
│   │   ├── organisations/  # Organisation pages
│   │   ├── leaderboards/   # Leaderboard page
│   │   ├── rising-stars/   # Rising stars page
│   │   ├── compare/        # Player comparison
│   │   ├── heatmap/        # Scoring heatmap
│   │   ├── grades/         # Grade/division pages
│   │   ├── competitions/   # Competition pages
│   │   └── search/         # Search page
│   └── tests/              # Playwright E2E tests
├── scraper/                # PlayHQ GraphQL scrapers
├── analysis/               # Python statistical analysis
├── data/                   # Local data files
├── scripts/                # Data export & utility scripts
├── dashboard/              # Streamlit dashboard assets
├── notebooks/              # Jupyter notebooks
└── models/                 # Trained ML models
```

---

## 📄 License

[MIT](LICENSE) © 2025 LittleBennos
