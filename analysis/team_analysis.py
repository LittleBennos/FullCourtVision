"""
FullCourtVision — Team Analysis
Team win rates, scoring patterns, home/away performance.
"""

import pandas as pd
import numpy as np
from typing import Dict, Union, Optional
from data_loader import load_games, query, DB_PATH


def team_record(team_id: str, db_path: str = DB_PATH) -> Dict[str, Union[int, float]]:
    """Get comprehensive win/loss record and scoring stats for a team.
    
    Calculates wins, losses, draws, win percentage, and scoring statistics
    across all completed games for the specified team.
    
    Args:
        team_id (str): Unique identifier for the team
        db_path (str): Path to the SQLite database file
        
    Returns:
        Dict[str, Union[int, float]]: Team performance metrics including:
            - wins: Number of wins
            - losses: Number of losses  
            - draws: Number of draws
            - played: Total games played
            - win_pct: Win percentage (0-100)
            - pts_for: Total points scored
            - pts_against: Total points allowed
            - avg_pf: Average points per game scored
            - avg_pa: Average points per game allowed
            - point_diff: Total point differential (+ is better)
    """
    games = query("""
        SELECT home_team_id, away_team_id, home_score, away_score
        FROM games
        WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'FINAL'
    """, [team_id, team_id], db_path)

    if games.empty:
        return {'wins': 0, 'losses': 0, 'draws': 0, 'played': 0, 'win_pct': 0}

    wins = losses = draws = 0
    pts_for = pts_against = 0

    for _, g in games.iterrows():
        if g['home_team_id'] == team_id:
            pf, pa = g['home_score'], g['away_score']
        else:
            pf, pa = g['away_score'], g['home_score']

        pts_for += pf
        pts_against += pa
        if pf > pa:
            wins += 1
        elif pf < pa:
            losses += 1
        else:
            draws += 1

    played = wins + losses + draws
    return {
        'wins': wins, 'losses': losses, 'draws': draws, 'played': played,
        'win_pct': round(wins / max(played, 1) * 100, 1),
        'pts_for': pts_for, 'pts_against': pts_against,
        'avg_pf': round(pts_for / max(played, 1), 1),
        'avg_pa': round(pts_against / max(played, 1), 1),
        'point_diff': pts_for - pts_against,
    }


def home_away_split(team_id: str, db_path: str = DB_PATH) -> Dict[str, Dict[str, Union[int, float]]]:
    """Analyze team performance split between home and away games.
    
    Separates team statistics into home vs away performance to identify
    any home field advantage or travel-related performance differences.
    
    Args:
        team_id (str): Unique identifier for the team
        db_path (str): Path to the SQLite database file
        
    Returns:
        Dict[str, Dict[str, Union[int, float]]]: Performance split containing:
            - home: Home game statistics (games, wins, win_pct, avg_pf, avg_pa)
            - away: Away game statistics (games, wins, win_pct, avg_pf, avg_pa)
    """
    games = query("""
        SELECT home_team_id, away_team_id, home_score, away_score
        FROM games
        WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'FINAL'
    """, [team_id, team_id], db_path)

    home = games[games['home_team_id'] == team_id]
    away = games[games['away_team_id'] == team_id]

    def calc(df, is_home):
        if df.empty:
            return {'games': 0, 'wins': 0, 'win_pct': 0, 'avg_pf': 0, 'avg_pa': 0}
        pf_col = 'home_score' if is_home else 'away_score'
        pa_col = 'away_score' if is_home else 'home_score'
        wins = (df[pf_col] > df[pa_col]).sum()
        return {
            'games': len(df), 'wins': int(wins),
            'win_pct': round(wins / len(df) * 100, 1),
            'avg_pf': round(df[pf_col].mean(), 1),
            'avg_pa': round(df[pa_col].mean(), 1),
        }

    return {'home': calc(home, True), 'away': calc(away, False)}


def grade_standings(grade_id: str, db_path: str = DB_PATH) -> pd.DataFrame:
    """Calculate league standings for all teams in a specific grade.
    
    Computes win-loss records, points for/against, point differential,
    and total points (typically 2 points per win) for all teams in the grade.
    
    Args:
        grade_id (str): Unique identifier for the grade/division
        db_path (str): Path to the SQLite database file
        
    Returns:
        pd.DataFrame: Standings table sorted by points then point differential.
                     Columns: team, P (played), W (wins), L (losses), 
                             PF (points for), PA (points against), 
                             PD (point differential), PTS (league points)
    """
    return query("""
        WITH team_results AS (
            SELECT home_team_id as team_id,
                CASE WHEN home_score > away_score THEN 1 ELSE 0 END as win,
                CASE WHEN home_score < away_score THEN 1 ELSE 0 END as loss,
                home_score as pf, away_score as pa
            FROM games WHERE grade_id = ? AND status = 'FINAL'
            UNION ALL
            SELECT away_team_id,
                CASE WHEN away_score > home_score THEN 1 ELSE 0 END,
                CASE WHEN away_score < home_score THEN 1 ELSE 0 END,
                away_score, home_score
            FROM games WHERE grade_id = ? AND status = 'FINAL'
        )
        SELECT t.name as team, COUNT(*) as P, SUM(win) as W, SUM(loss) as L,
               SUM(pf) as PF, SUM(pa) as PA, SUM(pf) - SUM(pa) as PD,
               SUM(win) * 2 as PTS
        FROM team_results tr JOIN teams t ON tr.team_id = t.id
        GROUP BY tr.team_id
        ORDER BY PTS DESC, PD DESC
    """, [grade_id, grade_id], db_path)


def team_scoring_patterns(team_id: str, db_path: str = DB_PATH) -> Dict[str, Union[str, int, float, None]]:
    """Analyze scoring patterns and player contributions for a team.
    
    Examines roster composition, top scorer contributions, scoring balance,
    and shot type distribution (3PT, 2PT, FT) across all team members.
    
    Args:
        team_id (str): Unique identifier for the team  
        db_path (str): Path to the SQLite database file
        
    Returns:
        Dict[str, Union[str, int, float, None]]: Scoring pattern analysis including:
            - top_scorer: Name of leading scorer (or None if no data)
            - top_scorer_pts: Points scored by top scorer
            - top_scorer_share: Percentage of team scoring by top scorer
            - depth: Number of players on roster
            - total_team_pts: Total team points across all players
            - team_3pt: Total 3-pointers made by team
            - team_2pt: Total 2-pointers made by team  
            - team_ft: Total free throws made by team
    """
    roster = query("""
        SELECT ps.player_id, p.first_name || ' ' || p.last_name as name,
               ps.games_played, ps.total_points, ps.one_point, ps.two_point, ps.three_point
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        WHERE ps.team_name = (SELECT name FROM teams WHERE id = ?)
        ORDER BY ps.total_points DESC
    """, [team_id], db_path)

    if roster.empty:
        return {'top_scorer': None, 'depth': 0}

    total_team_pts = roster['total_points'].sum()
    top = roster.iloc[0]

    return {
        'top_scorer': top['name'],
        'top_scorer_pts': int(top['total_points']),
        'top_scorer_share': round(top['total_points'] / max(total_team_pts, 1) * 100, 1),
        'depth': len(roster),
        'total_team_pts': int(total_team_pts),
        'team_3pt': int(roster['three_point'].sum()),
        'team_2pt': int(roster['two_point'].sum()),
        'team_ft': int(roster['one_point'].sum()),
    }


if __name__ == "__main__":
    teams = query("SELECT id, name FROM teams LIMIT 5")
    for _, t in teams.iterrows():
        rec = team_record(t['id'])
        print(f"{t['name']}: {rec['wins']}W-{rec['losses']}L ({rec['win_pct']}%)")
