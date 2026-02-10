"""
FullCourtVision — Data Loader
Dual-source: SQLite (local) with parquet fallback (Streamlit Cloud).
"""

import os
import re
import sqlite3
import pandas as pd
import numpy as np
from typing import List, Optional

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(_BASE_DIR, "data", "playhq.db")
PARQUET_DIR = os.path.join(_BASE_DIR, "data", "parquet")


def _use_sqlite() -> bool:
    """Check if SQLite DB is available."""
    return os.path.isfile(DB_PATH)


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Get a SQLite connection."""
    return sqlite3.connect(db_path)


def query(sql: str, params=None, db_path: str = DB_PATH) -> pd.DataFrame:
    """Execute a SQL query and return a DataFrame (SQLite only)."""
    conn = get_connection(db_path)
    return pd.read_sql_query(sql, conn, params=params or [])


def _load_parquet(table: str) -> pd.DataFrame:
    """Load a table from parquet."""
    path = os.path.join(PARQUET_DIR, f"{table}.parquet")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Parquet file not found: {path}")
    return pd.read_parquet(path)


def load_table(table: str) -> pd.DataFrame:
    """Load a raw table from SQLite or parquet fallback."""
    if _use_sqlite():
        return query(f"SELECT * FROM [{table}]")
    return _load_parquet(table)


def load_players() -> pd.DataFrame:
    """Load all players."""
    return load_table("players")


def load_player_stats() -> pd.DataFrame:
    """Load player statistics with enriched per-game metrics and contextual data.
    
    Loads raw player statistics and joins with grades, seasons, and player info
    to create a comprehensive dataset. Automatically calculates per-game metrics
    and extracts age group classifications.
    
    Returns:
        pd.DataFrame: Enriched player statistics including:
            - Raw stats: games_played, total_points, one_point, two_point, three_point, total_fouls
            - Derived metrics: ppg, fpg, ft_pg, fg2_pg, fg3_pg (all per-game)
            - Context: grade_name, season_name, season_start, first_name, last_name
            - Classification: age_group (extracted from grade_name, e.g., 'U14', 'Senior')
    """
    if _use_sqlite():
        df = query("""
            SELECT ps.*, g.name as grade_name, s.name as season_name, s.start_date as season_start,
                   p.first_name, p.last_name
            FROM player_stats ps
            JOIN grades g ON ps.grade_id = g.id
            JOIN seasons s ON g.season_id = s.id
            JOIN players p ON ps.player_id = p.id
        """)
    else:
        ps = _load_parquet("player_stats")
        g = _load_parquet("grades")[["id", "name", "season_id"]].rename(columns={"id": "grade_id", "name": "grade_name"})
        s = _load_parquet("seasons")[["id", "name", "start_date"]].rename(columns={"id": "season_id", "name": "season_name", "start_date": "season_start"})
        p = _load_parquet("players")[["id", "first_name", "last_name"]].rename(columns={"id": "player_id"})
        df = ps.merge(g, on="grade_id", how="left")
        df = df.merge(s, on="season_id", how="left")
        df = df.merge(p, on="player_id", how="left")

    gp = df['games_played'].clip(lower=1)
    df['ppg'] = (df['total_points'] / gp).round(2)
    df['fpg'] = (df['total_fouls'] / gp).round(2)
    df['ft_pg'] = (df['one_point'] / gp).round(2)
    df['fg2_pg'] = (df['two_point'] / gp).round(2)
    df['fg3_pg'] = (df['three_point'] / gp).round(2)
    df['age_group'] = df['grade_name'].apply(extract_age_group)

    return df


def load_games() -> pd.DataFrame:
    """Load game data with team names and calculated game metrics.
    
    Loads raw game records and enriches with team names, grade/season context,
    and derived metrics like point margins and total scores.
    
    Returns:
        pd.DataFrame: Enriched game data including:
            - Raw data: home_team_id, away_team_id, home_score, away_score, date, status
            - Team names: home_team_name, away_team_name
            - Context: grade_name, season_name
            - Derived metrics: margin (home - away), total_score (home + away)
            - Parsed date: Converted to datetime format
    """
    if _use_sqlite():
        df = query("""
            SELECT g.*, ht.name as home_team_name, at.name as away_team_name,
                   gr.name as grade_name, s.name as season_name
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.id
            JOIN teams at ON g.away_team_id = at.id
            JOIN grades gr ON g.grade_id = gr.id
            JOIN seasons s ON gr.season_id = s.id
        """)
    else:
        g = _load_parquet("games")
        t = _load_parquet("teams")[["id", "name"]]
        gr = _load_parquet("grades")[["id", "name", "season_id"]].rename(columns={"name": "grade_name"})
        s = _load_parquet("seasons")[["id", "name"]].rename(columns={"name": "season_name"})
        df = g.merge(t.rename(columns={"id": "home_team_id", "name": "home_team_name"}), on="home_team_id", how="left")
        df = df.merge(t.rename(columns={"id": "away_team_id", "name": "away_team_name"}), on="away_team_id", how="left")
        df = df.merge(gr.rename(columns={"id": "grade_id"}), on="grade_id", how="left")
        df = df.merge(s.rename(columns={"id": "season_id"}), on="season_id", how="left")

    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df['margin'] = df['home_score'] - df['away_score']
    df['total_score'] = df['home_score'] + df['away_score']
    return df


def load_teams() -> pd.DataFrame:
    """Load all teams."""
    if _use_sqlite():
        return query("""
            SELECT t.*, o.name as org_name, s.name as season_name
            FROM teams t
            JOIN organisations o ON t.organisation_id = o.id
            JOIN seasons s ON t.season_id = s.id
        """)
    else:
        t = _load_parquet("teams")
        o = _load_parquet("organisations")[["id", "name"]].rename(columns={"id": "organisation_id", "name": "org_name"})
        s = _load_parquet("seasons")[["id", "name"]].rename(columns={"id": "season_id", "name": "season_name"})
        df = t.merge(o, on="organisation_id", how="left")
        df = df.merge(s, on="season_id", how="left")
        return df


def load_organisations() -> pd.DataFrame:
    """Load all organisations."""
    return load_table("organisations")


def aggregate_player_career(stats_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate player statistics across all seasons into career totals.
    
    Takes season-by-season player statistics and combines them into
    career-spanning totals and averages. Useful for career analysis
    and cross-player comparisons.
    
    Args:
        stats_df (pd.DataFrame): Season-level player statistics from load_player_stats()
        
    Returns:
        pd.DataFrame: Career-aggregated statistics including:
            - Totals: games_played, total_points, one_point, two_point, three_point, total_fouls
            - Career averages: ppg, fpg, fg3_pg (calculated from career totals)
            - Breadth metrics: num_grades, num_seasons (diversity of experience)
            - Identity: player_id, first_name, last_name, player_name
    """
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
    print(f"Data source: {'SQLite' if _use_sqlite() else 'Parquet'}")
    stats = load_player_stats()
    print(f"Loaded {len(stats):,} stat lines")
    games = load_games()
    print(f"Loaded {len(games):,} games")
    career = aggregate_player_career(stats)
    print(f"Aggregated {len(career):,} player careers")
