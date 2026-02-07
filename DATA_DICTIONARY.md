# Data Dictionary — playhq.db

> SQLite database containing Victorian basketball data scraped from PlayHQ's GraphQL API.
>
> **Location:** `data/playhq.db` (44 MB)
> **Last updated:** February 2025

---

## Entity Relationship Overview

```
organisations (887)
  └─▶ competitions (12)
        └─▶ seasons (59)
              ├─▶ grades (2,628)
              │     ├─▶ rounds (11,480)
              │     │     └─▶ games (46,227)
              │     └─▶ player_stats (138,175)
              └─▶ teams (2,231)

players (24,557)
  └─▶ player_stats (138,175)

scrape_log (1,321)
```

---

## Tables

### `organisations`

Basketball clubs and associations registered with Basketball Victoria.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ organisation UUID |
| `name` | TEXT | Organisation name (e.g., "Eltham Wildcats Basketball Club") |
| `type` | TEXT | Organisation type (e.g., "club", "association") |
| `tenant` | TEXT | PlayHQ tenant identifier (e.g., "basketball-victoria") |
| `email` | TEXT | Contact email |
| `phone` | TEXT | Contact phone number |
| `website` | TEXT | Organisation website URL |
| `address` | TEXT | Street address |
| `suburb` | TEXT | Suburb |
| `state` | TEXT | State (e.g., "VIC") |
| `postcode` | TEXT | Postcode |
| `updated_at` | TEXT | Last update timestamp |

**Row count:** 887

---

### `competitions`

Competition groupings within an organisation (e.g., "Domestic", "Representative").

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ competition UUID |
| `organisation_id` | TEXT (FK → organisations) | Parent organisation |
| `name` | TEXT | Competition name |
| `type` | TEXT | Competition type |

**Row count:** 12

---

### `seasons`

Seasonal instances of a competition (e.g., "Summer 2024/25", "Winter 2025").

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ season UUID |
| `competition_id` | TEXT (FK → competitions) | Parent competition |
| `name` | TEXT | Season name |
| `start_date` | TEXT | Season start date (ISO 8601) |
| `end_date` | TEXT | Season end date (ISO 8601) |

**Row count:** 59

---

### `grades`

Age/skill divisions within a season (e.g., "Boys U14 A", "Girls U12 BC").

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ grade UUID |
| `season_id` | TEXT (FK → seasons) | Parent season |
| `name` | TEXT | Grade name (encodes age group + division) |
| `type` | TEXT | Grade type |

**Row count:** 2,628

---

### `teams`

Teams competing within a season.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ team UUID |
| `name` | TEXT | Team name |
| `organisation_id` | TEXT (FK → organisations) | Parent organisation |
| `season_id` | TEXT (FK → seasons) | Season the team is registered in |

**Row count:** 2,231

---

### `rounds`

Rounds within a grade's schedule.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ round UUID |
| `grade_id` | TEXT (FK → grades) | Parent grade |
| `name` | TEXT | Round display name |
| `number` | INTEGER | Round number |
| `provisional_date` | TEXT | Scheduled date for the round |
| `is_finals` | INTEGER | Whether this is a finals round (0/1) |

**Row count:** 11,480

---

### `games`

Individual game results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ game UUID |
| `grade_id` | TEXT (FK → grades) | Grade this game belongs to |
| `round_id` | TEXT (FK → rounds) | Round this game belongs to |
| `round_name` | TEXT | Round display name (denormalised) |
| `home_team_id` | TEXT (FK → teams) | Home team |
| `away_team_id` | TEXT (FK → teams) | Away team |
| `home_score` | INTEGER | Home team final score |
| `away_score` | INTEGER | Away team final score |
| `date` | TEXT | Game date (ISO 8601) |
| `time` | TEXT | Game start time |
| `venue` | TEXT | Venue name |
| `court` | TEXT | Court identifier |
| `status` | TEXT | Game status (e.g., "completed", "scheduled") |

**Row count:** 46,227

---

### `players`

Individual player profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | PlayHQ player profile UUID |
| `first_name` | TEXT | Player first name |
| `last_name` | TEXT | Player last name |
| `updated_at` | TEXT | Last update timestamp |

**Row count:** 24,557

---

### `player_stats`

Per-grade season statistics for a player. A player with multiple seasons or grades will have multiple rows.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `player_id` | TEXT (FK → players) | Player profile |
| `grade_id` | TEXT (FK → grades) | Grade the stats belong to |
| `team_name` | TEXT | Team name (denormalised) |
| `games_played` | INTEGER | Number of games played |
| `total_points` | INTEGER | Total points scored in the season |
| `one_point` | INTEGER | Free throws / 1-point field goals made |
| `two_point` | INTEGER | 2-point field goals made |
| `three_point` | INTEGER | 3-point field goals made |
| `total_fouls` | INTEGER | Total personal fouls |
| `ranking` | INTEGER | Grade ranking by total points |

**Row count:** 138,175

**Derived metrics:**
- PPG (points per game) = `total_points / games_played`
- FPG (fouls per game) = `total_fouls / games_played`
- 3PT rate = `three_point / (one_point + two_point + three_point)`

---

### `scrape_log`

Audit trail of scraping operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment ID |
| `entity_type` | TEXT | Type of entity scraped (e.g., "organisation", "grade") |
| `entity_id` | TEXT | UUID of the scraped entity |
| `scraped_at` | TEXT | Timestamp of scrape (ISO 8601) |
| `success` | INTEGER | Whether the scrape succeeded (0/1) |
| `error` | TEXT | Error message if failed |

**Row count:** 1,321

---

## Common Queries

```sql
-- Top 10 scorers by PPG (min 5 games)
SELECT p.first_name || ' ' || p.last_name AS name,
       ps.total_points, ps.games_played,
       ROUND(CAST(ps.total_points AS FLOAT) / ps.games_played, 1) AS ppg
FROM players p
JOIN player_stats ps ON p.id = ps.player_id
WHERE ps.games_played >= 5
ORDER BY ppg DESC
LIMIT 10;

-- Organisation breakdown by suburb
SELECT suburb, COUNT(*) AS orgs
FROM organisations
WHERE state = 'VIC'
GROUP BY suburb
ORDER BY orgs DESC
LIMIT 20;

-- Grade participation counts
SELECT g.name, COUNT(ps.id) AS players
FROM grades g
JOIN player_stats ps ON g.id = ps.grade_id
GROUP BY g.id
ORDER BY players DESC
LIMIT 20;
```
