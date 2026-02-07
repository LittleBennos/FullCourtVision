# FullCourtVision — Project Roadmap

> A data science portfolio project analysing junior basketball performance data from PlayHQ (Basketball Victoria).

## Current State (as of Feb 2025)

- **887 organisations** catalogued from Basketball Victoria's PlayHQ platform
- **16,955 players** with individual stat lines across **2,417 grades**
- **91,704 player-stat records**, **40,152 games**, **2,231 teams**
- Working analysis pipeline: linear regression (R²=0.989), K-means clustering, descriptive stats
- Node.js scraper hitting PlayHQ GraphQL API (no auth required)
- SQLite database (`data/playhq.db`)

---

## Phase 1: Expand Data Collection

**Goal:** Move beyond EDJBA to cover major Victorian associations and pull game-level data.

| Task | Status | Notes |
|------|--------|-------|
| Scrape additional associations (Diamond Valley, Knox, Manningham, etc.) | ⬜ | 887 orgs available — prioritise top 20 by player count |
| Pull fixture/game results via `discoverFixtureByRound` | ⬜ | 9,797 rounds already indexed, need game scores |
| Get team rosters via `discoverTeams` | ⬜ | Link players → teams → games |
| Scrape ladder/standings via grade endpoints | ⬜ | `ladder` table exists but empty |
| Build incremental scraper (only fetch new/updated data) | ⬜ | Check `scrape_log` table |
| Player profile deduplication across seasons | ⬜ | Same `profile.id` across grades = same person |

**Key API Endpoints:**
- `discoverOrganisations` — find orgs
- `discoverCompetitions` / `discoverSeason` / `discoverGrade` — drill into structure
- `gradePlayerStatistics` — player stats per grade
- `discoverFixtureByRound` — game results per round
- `discoverTeamFixture` — team schedule + results
- `discoverTeams` — team listing per season

---

## Phase 2: Advanced ML Models

**Goal:** Go beyond basic regression — build models that predict, classify, and reveal patterns.

| Task | Status | Notes |
|------|--------|-------|
| Random Forest for performance prediction | ✅ | Compare R² to linear regression baseline |
| Player development tracking across seasons | ✅ | Same player in Summer 24/25 → Winter 25 → Summer 25/26 |
| Age group percentile rankings | ✅ | What's "good" for U12 vs U16? |
| Foul trouble prediction model | ⬜ | Predict high-foul games from player profile |
| Team composition analysis | ⬜ | What mix of player archetypes wins? |
| XGBoost / Gradient Boosting models | ⬜ | Potential uplift over Random Forest |
| Feature importance analysis | ✅ | Which stats matter most? |
| Elbow method for optimal K in clustering | ⬜ | Currently hardcoded K=3 |

---

## Phase 3: Personal Analytics — Player Tracker

**Goal:** Dedicated analysis for tracking any individual player's development.

| Task | Status | Notes |
|------|--------|-------|
| Career progression dashboard | ⬜ | PPG, FPG, shooting splits over time |
| Percentile ranking vs age group peers | ⬜ | Where does the player sit in their age group? |
| Comparison to top performers at same age | ⬜ | "At U14, the top 10% scored X PPG — player scored Y" |
| Career trajectory projection | ⬜ | ML-based: if current trend continues, project U18 stats |
| Strengths/weaknesses profile | ⬜ | Radar chart of key metrics vs peer averages |
| Game-by-game tracker (requires fixture data) | ⬜ | Depends on Phase 1 |

---

## Phase 4: Streamlit Dashboard

**Goal:** Interactive web app for exploring the data.

| Task | Status | Notes |
|------|--------|-------|
| Player search and comparison tool | ⬜ | Search by name, compare side-by-side |
| Season-over-season trend charts | ⬜ | Line charts, sparklines |
| Team rankings and strength of schedule | ⬜ | Based on opponent quality |
| Individual player dashboard page | ⬜ | Dedicated tab |
| Interactive cluster visualisation | ⬜ | Plotly scatter with hover info |
| Age group leaderboards | ⬜ | Filter by U10/U12/U14/U16/U18 |
| Export to PDF/image | ⬜ | For sharing |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Data Storage | SQLite (playhq.db) |
| Scraper | Node.js + better-sqlite3 |
| Analysis | Python 3.12 (pandas, scikit-learn, scipy, matplotlib, seaborn) |
| Dashboard | Streamlit + Plotly (Phase 4) |
| Version Control | Git + GitHub |

---

## Data Schema (playhq.db)

```
organisations (887)  →  competitions (1)  →  seasons (13)  →  grades (2,417)
                                                                    ↓
                                                              rounds (9,797)
                                                                    ↓
                                                              games (40,152)
                                                                    ↓
players (16,955)  →  player_stats (91,704)  ←  grades
                                                    ↓
                                              teams (2,231)
```
