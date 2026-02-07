# FullCourtVision 🏀

A data analytics platform for Australian community basketball, powered by PlayHQ data.

> *Full court vision* — the ability to see everything happening on the court. That's what we do with data.

## What it does

- **Scrapes** game results, player stats, team data, and fixtures from PlayHQ's GraphQL API
- **Stores** everything in a structured SQLite database (887+ basketball organisations in Victoria)
- **Analyses** player performance using statistical models (linear regression, random forest, clustering)
- **Visualises** insights through an interactive dashboard

## Project Structure

```
FullCourtVision/
├── scraper/          # PlayHQ GraphQL scraper
│   ├── playhq-db.js      # Database schema & helpers
│   ├── playhq-scraper.js  # Main scraper engine
│   └── queries/           # Captured GraphQL queries
├── data/             # SQLite database & exports
├── analysis/         # Jupyter notebooks & Python scripts
│   ├── player_analysis.py
│   ├── predictions.py
│   └── notebooks/
├── dashboard/        # Interactive web dashboard
├── models/           # Trained ML models
└── docs/             # Documentation & API notes
```

## Tech Stack

- **Scraper**: Node.js + PlayHQ GraphQL API (no auth required)
- **Database**: SQLite (portable, queryable, zero config)
- **Analysis**: Python (pandas, scikit-learn, matplotlib, seaborn)
- **Dashboard**: Streamlit / Plotly Dash
- **Automation**: Cron-based scheduled scraping

## PlayHQ API

The scraper interfaces with PlayHQ's public GraphQL API at `api.playhq.com/graphql`.
No authentication required — just a `tenant` header (e.g., `basketball-victoria`).

### Key Queries
- `discoverOrganisations` — list all basketball organisations
- `discoverCompetitions` — competitions & seasons for an org
- `gradePlayerStatistics` — player stats per grade (paginated)
- `discoverFixtureByRound` — game results & fixtures
- `discoverTeams` — teams per season
- `discoverTeamFixture` — full fixture for a team

## Data Coverage

- **887** basketball organisations in Victoria
- **EDJBA** (Eastern Districts Junior Basketball Association) — primary focus
- Historical data back to 2021
- Player stats: GP, PTS, 1PT, 2PT, 3PT, Fouls

## Analysis Goals

- Player performance tracking & progression
- Scoring trend prediction (linear regression)
- Player classification & clustering (random forest, k-means)
- Win probability modelling
- Age-adjusted performance comparison (U14 → U16 → U18)
- Team chemistry & composition analysis
- Foul tendency profiling
- Draft/recruitment recommendations

## Setup

```bash
# Clone
git clone git@github.com:LittleBennos/FullCourtVision.git
cd FullCourtVision

# Install scraper dependencies
cd scraper
npm install

# Run scraper
node playhq-scraper.js orgs          # Scrape all organisations
node playhq-scraper.js assoc <orgId> # Scrape an association

# Install analysis dependencies
cd ../analysis
pip install -r requirements.txt
```

## License

Private project.
