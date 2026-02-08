import sqlite3, json, os

conn = sqlite3.connect(r'C:\Projects\FullCourtVision\data\playhq.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

out = r'C:\Projects\FullCourtVision\web\src\data'
os.makedirs(out, exist_ok=True)

# Quick stats
stats = {}
for t in ['players', 'games', 'organisations', 'teams', 'competitions', 'seasons', 'grades']:
    c.execute(f"SELECT COUNT(*) FROM {t}")
    stats[t] = c.fetchone()[0]
with open(os.path.join(out, 'stats.json'), 'w') as f:
    json.dump(stats, f)
print(f"Stats: {stats}")

# Featured player
c.execute("SELECT * FROM players WHERE id='f1fa18fc-a93f-45b9-ac91-f70652744dd7'")
row = c.fetchone()
featured = dict(row) if row else None
print(f"Featured: {featured}")

# Top 500 players by total points
c.execute("""
    SELECT p.id, p.first_name, p.last_name,
           SUM(ps.games_played) as total_games,
           SUM(ps.total_points) as total_points,
           SUM(ps.one_point) as total_one_point,
           SUM(ps.two_point) as total_two_point,
           SUM(ps.three_point) as total_three_point,
           SUM(ps.total_fouls) as total_fouls,
           COUNT(DISTINCT ps.grade_id) as seasons_played,
           ROUND(CAST(SUM(ps.total_points) AS FLOAT) / NULLIF(SUM(ps.games_played), 0), 1) as ppg
    FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    GROUP BY p.id
    HAVING total_games > 0
    ORDER BY total_points DESC
    LIMIT 500
""")
top_players = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'top_players.json'), 'w') as f:
    json.dump(top_players, f)
print(f"Top players: {len(top_players)}")

# All players with aggregated stats
c.execute("""
    SELECT p.id, p.first_name, p.last_name,
           SUM(ps.games_played) as total_games,
           SUM(ps.total_points) as total_points,
           ROUND(CAST(SUM(ps.total_points) AS FLOAT) / NULLIF(SUM(ps.games_played), 0), 1) as ppg
    FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    GROUP BY p.id
    HAVING total_games > 0
    ORDER BY p.last_name, p.first_name
""")
all_players = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'all_players.json'), 'w') as f:
    json.dump(all_players, f)
print(f"All players with stats: {len(all_players)}")

# Featured player full stats
c.execute("""
    SELECT ps.*, g.name as grade_name, g.type as grade_type, s.name as season_name,
           comp.name as competition_name
    FROM player_stats ps
    JOIN grades g ON g.id = ps.grade_id
    JOIN seasons s ON s.id = g.season_id
    JOIN competitions comp ON comp.id = s.competition_id
    WHERE ps.player_id = 'f1fa18fc-a93f-45b9-ac91-f70652744dd7'
    ORDER BY s.start_date
""")
featured_stats = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'featured_player.json'), 'w') as f:
    json.dump({'player': featured, 'stats': featured_stats}, f)
print(f"Featured player stats: {len(featured_stats)}")

# Organisations
c.execute("SELECT id, name, type, suburb, state, website FROM organisations ORDER BY name")
orgs = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'organisations.json'), 'w') as f:
    json.dump(orgs, f)
print(f"Orgs: {len(orgs)}")

# Teams - simple query without expensive subqueries
c.execute("""
    SELECT t.id, t.name, t.organisation_id, t.season_id,
           o.name as org_name, s.name as season_name
    FROM teams t
    LEFT JOIN organisations o ON o.id = t.organisation_id
    LEFT JOIN seasons s ON s.id = t.season_id
    ORDER BY t.name
""")
teams = [dict(r) for r in c.fetchall()]

# Build win/loss from games using a single pass
print("Computing team records...")
c.execute("SELECT home_team_id, away_team_id, home_score, away_score FROM games WHERE status='COMPLETED' OR home_score IS NOT NULL")
team_records = {}
for g in c.fetchall():
    h, a, hs, as_ = g['home_team_id'], g['away_team_id'], g['home_score'], g['away_score']
    if hs is None or as_ is None:
        continue
    for tid in [h, a]:
        if tid not in team_records:
            team_records[tid] = {'wins': 0, 'losses': 0, 'games': 0}
    team_records[h]['games'] += 1
    team_records[a]['games'] += 1
    if hs > as_:
        team_records[h]['wins'] += 1
        team_records[a]['losses'] += 1
    elif as_ > hs:
        team_records[a]['wins'] += 1
        team_records[h]['losses'] += 1

for t in teams:
    rec = team_records.get(t['id'], {'wins': 0, 'losses': 0, 'games': 0})
    t['wins'] = rec['wins']
    t['losses'] = rec['losses']
    t['games_played'] = rec['games']

with open(os.path.join(out, 'teams.json'), 'w') as f:
    json.dump(teams, f)
print(f"Teams: {len(teams)}")

# Competitions
c.execute("""
    SELECT c.id, c.name, c.type, c.organisation_id, o.name as org_name
    FROM competitions c
    LEFT JOIN organisations o ON o.id = c.organisation_id
    ORDER BY c.name
""")
comps = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'competitions.json'), 'w') as f:
    json.dump(comps, f)

# Seasons
c.execute("""
    SELECT s.*, c.name as competition_name
    FROM seasons s
    JOIN competitions c ON c.id = s.competition_id
    ORDER BY s.start_date DESC
""")
seasons = [dict(r) for r in c.fetchall()]
with open(os.path.join(out, 'seasons.json'), 'w') as f:
    json.dump(seasons, f)

# Leaderboards
c.execute("""
    SELECT p.id, p.first_name, p.last_name,
           SUM(ps.games_played) as total_games,
           SUM(ps.total_points) as total_points,
           SUM(ps.three_point) as total_threes,
           ROUND(CAST(SUM(ps.total_points) AS FLOAT) / NULLIF(SUM(ps.games_played), 0), 1) as ppg
    FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    GROUP BY p.id
    HAVING total_games >= 10
    ORDER BY ppg DESC
    LIMIT 100
""")
leaderboard_ppg = [dict(r) for r in c.fetchall()]

c.execute("""
    SELECT p.id, p.first_name, p.last_name,
           SUM(ps.games_played) as total_games,
           SUM(ps.total_points) as total_points,
           ROUND(CAST(SUM(ps.total_points) AS FLOAT) / NULLIF(SUM(ps.games_played), 0), 1) as ppg
    FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    GROUP BY p.id
    HAVING total_games >= 10
    ORDER BY total_games DESC
    LIMIT 100
""")
leaderboard_games = [dict(r) for r in c.fetchall()]

c.execute("""
    SELECT p.id, p.first_name, p.last_name,
           SUM(ps.games_played) as total_games,
           SUM(ps.three_point) as total_threes,
           ROUND(CAST(SUM(ps.three_point) AS FLOAT) / NULLIF(SUM(ps.games_played), 0), 1) as threes_pg
    FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    GROUP BY p.id
    HAVING total_games >= 10 AND total_threes > 0
    ORDER BY total_threes DESC
    LIMIT 100
""")
leaderboard_threes = [dict(r) for r in c.fetchall()]

with open(os.path.join(out, 'leaderboards.json'), 'w') as f:
    json.dump({'ppg': leaderboard_ppg, 'games': leaderboard_games, 'threes': leaderboard_threes}, f)

# Player details for top 500
print("Exporting player details...")
top_ids = [p['id'] for p in top_players]
player_details = {}
for pid in top_ids:
    c.execute("SELECT * FROM players WHERE id=?", (pid,))
    player = dict(c.fetchone())
    c.execute("""
        SELECT ps.*, g.name as grade_name, g.type as grade_type, s.name as season_name,
               comp.name as competition_name, s.start_date
        FROM player_stats ps
        JOIN grades g ON g.id = ps.grade_id
        JOIN seasons s ON s.id = g.season_id
        JOIN competitions comp ON comp.id = s.competition_id
        WHERE ps.player_id = ?
        ORDER BY s.start_date
    """, (pid,))
    pstats = [dict(r) for r in c.fetchall()]
    player_details[pid] = {'player': player, 'stats': pstats}

with open(os.path.join(out, 'player_details.json'), 'w') as f:
    json.dump(player_details, f)
print(f"Player details exported: {len(player_details)}")

print("\nDone!")
conn.close()
