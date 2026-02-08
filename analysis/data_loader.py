"""
FullCourtVision — Data Loader
Load from SQLite into pandas DataFrames, clean and prep data.
"""

import os
import re
import sqlite3
import pandas as pd
import numpy as np

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "playhq.db")


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Get a SQLite connection."""
    return sqlite3.connect(db_path)


def query(sql: str, params=None, db_path: str = DB_PATH) -> pd.DataFrame:
    """Execute a SQL query and return a DataFrame."""
    conn = get_connection(db_path)
    return pd.read_sql_query(sql, conn, params=params or [])


def load_players(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load all players."""
    return query("SELECT * FROM players", db_path=db_path)


def load_player_stats(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load player stats with derived per-game metrics."""
    df = query("""
        SELECT ps.*, g.name as grade_name, s.name as season_name, s.start_date as season_start,
               p.first_name, p.last_name
        FROM player_stats ps
        JOIN grades g ON ps.grade_id = g.id
        JOIN seasons s ON g.season_id = s.id
        JOIN players p ON ps.player_id = p.id
    """, db_path=db_path)

    # Derived metrics
    gp = df['games_played'].clip(lower=1)
    df['ppg'] = (df['total_points'] / gp).round(2)
    df['fpg'] = (df['total_fouls'] / gp).round(2)
    df['ft_pg'] = (df['one_point'] / gp).round(2)
    df['fg2_pg'] = (df['two_point'] / gp).round(2)
    df['fg3_pg'] = (df['three_point'] / gp).round(2)

    # Extract age group from grade name
    df['age_group'] = df['grade_name'].apply(extract_age_group)

    return df


def load_games(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load all games with team names."""
    df = query("""
        SELECT g.*, ht.name as home_team_name, at.name as away_team_name,
               gr.name as grade_name, s.name as season_name
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        JOIN grades gr ON g.grade_id = gr.id
        JOIN seasons s ON gr.season_id = s.id
    """, db_path=db_path)
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df['margin'] = df['home_score'] - df['away_score']
    df['total_score'] = df['home_score'] + df['away_score']
    return df


def load_teams(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load all teams."""
    return query("""
        SELECT t.*, o.name as org_name, s.name as season_name
        FROM teams t
        JOIN organisations o ON t.organisation_id = o.id
        JOIN seasons s ON t.season_id = s.id
    """, db_path=db_path)


def load_organisations(db_path: str = DB_PATH) -> pd.DataFrame:
    """Load all organisations."""
    return query("SELECT * FROM organisations", db_path=db_path)


def aggregate_player_career(stats_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate player stats across all seasons into career totals."""
    career = stats_df.groupby(['player_id', 'first_name', 'last_name']).agg({
        'games_played': 'sum',
        'total_points': 'sum',
        'one_point': 'sum',
        'two_point': 'sum',
        'three_point': 'sum',
        'total_fouls': 'sum',
        'grade_name': 'nunique',
        'season_name': 'nunique',
    }).rename(columns={'grade_name': 'num_grades', 'season_name': 'num_seasons'}).reset_index()

    gp = career['games_played'].clip(lower=1)
    career['ppg'] = (career['total_points'] / gp).round(2)
    career['fpg'] = (career['total_fouls'] / gp).round(2)
    career['fg3_pg'] = (career['three_point'] / gp).round(2)
    career['player_name'] = career['first_name'] + ' ' + career['last_name']

    return career


def extract_age_group(grade_name: str) -> str:
    """Extract age group (e.g., 'U14') from grade name."""
    m = re.search(r'(U\d{2})', str(grade_name))
    return m.group(1) if m else 'Senior'


if __name__ == "__main__":
    stats = load_player_stats()
    print(f"Loaded {len(stats):,} stat lines")
    games = load_games()
    print(f"Loaded {len(games):,} games")
    career = aggregate_player_career(stats)
    print(f"Aggregated {len(career):,} player careers")
    print(f"Top 5 scorers by PPG (min 10 GP):")
    top = career[career['games_played'] >= 10].nlargest(5, 'ppg')
    print(top[['player_name', 'games_played', 'total_points', 'ppg']].to_string(index=False))
