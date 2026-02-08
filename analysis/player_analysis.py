"""
FullCourtVision — Player Analysis
Per-player career stats, PPG trends, shooting percentages, consistency metrics.
"""

import numpy as np
import pandas as pd
from .data_loader import load_player_stats, aggregate_player_career, DB_PATH


def get_player_profile(player_id: str, db_path: str = DB_PATH) -> dict:
    """Get comprehensive player profile with career stats and trends."""
    stats = load_player_stats(db_path)
    player_stats = stats[stats['player_id'] == player_id].sort_values('season_start')

    if player_stats.empty:
        return None

    row = player_stats.iloc[0]
    name = f"{row['first_name']} {row['last_name']}"

    # Career totals
    total_gp = int(player_stats['games_played'].sum())
    total_pts = int(player_stats['total_points'].sum())
    total_fouls = int(player_stats['total_fouls'].sum())
    total_ft = int(player_stats['one_point'].sum())
    total_2pt = int(player_stats['two_point'].sum())
    total_3pt = int(player_stats['three_point'].sum())

    gp = max(total_gp, 1)
    total_makes = total_ft + total_2pt + total_3pt

    return {
        'player_id': player_id,
        'name': name,
        'teams': player_stats['team_name'].dropna().unique().tolist(),
        'age_groups': sorted(player_stats['age_group'].unique().tolist()),
        'seasons': player_stats['season_name'].unique().tolist(),
        'career': {
            'games_played': total_gp,
            'total_points': total_pts,
            'ppg': round(total_pts / gp, 1),
            'fpg': round(total_fouls / gp, 1),
            'ft_makes': total_ft,
            '2pt_makes': total_2pt,
            '3pt_makes': total_3pt,
            'ft_pct': round(total_ft / max(total_makes, 1) * 100, 1),
            '2pt_pct': round(total_2pt / max(total_makes, 1) * 100, 1),
            '3pt_pct': round(total_3pt / max(total_makes, 1) * 100, 1),
        },
        'season_breakdown': player_stats[[
            'season_name', 'team_name', 'grade_name', 'games_played',
            'total_points', 'ppg', 'fpg', 'fg3_pg'
        ]].to_dict('records'),
    }


def scoring_trend(player_id: str, db_path: str = DB_PATH) -> pd.DataFrame:
    """Get season-over-season scoring trend for a player."""
    stats = load_player_stats(db_path)
    player_stats = stats[stats['player_id'] == player_id].sort_values('season_start')

    if player_stats.empty:
        return pd.DataFrame()

    trend = player_stats.groupby(['season_name', 'season_start']).agg({
        'games_played': 'sum',
        'total_points': 'sum',
        'total_fouls': 'sum',
        'three_point': 'sum',
    }).reset_index().sort_values('season_start')

    gp = trend['games_played'].clip(lower=1)
    trend['ppg'] = (trend['total_points'] / gp).round(1)
    trend['fpg'] = (trend['total_fouls'] / gp).round(1)
    trend['fg3_pg'] = (trend['three_point'] / gp).round(1)

    # Trend direction
    if len(trend) >= 2:
        slope = np.polyfit(range(len(trend)), trend['ppg'].values, 1)[0]
        trend['trend'] = 'improving' if slope > 0.5 else ('declining' if slope < -0.5 else 'stable')
    else:
        trend['trend'] = 'insufficient_data'

    return trend


def consistency_metrics(player_id: str, db_path: str = DB_PATH) -> dict:
    """Calculate consistency metrics across seasons."""
    stats = load_player_stats(db_path)
    player_stats = stats[stats['player_id'] == player_id]

    if len(player_stats) < 2:
        return {'cv': None, 'std_ppg': None, 'consistency_rating': 'insufficient_data'}

    ppg_values = player_stats['ppg'].values
    mean_ppg = ppg_values.mean()
    std_ppg = ppg_values.std()
    cv = std_ppg / max(mean_ppg, 0.01)

    return {
        'mean_ppg': round(mean_ppg, 2),
        'std_ppg': round(std_ppg, 2),
        'cv': round(cv, 3),
        'min_ppg': round(ppg_values.min(), 2),
        'max_ppg': round(ppg_values.max(), 2),
        'consistency_rating': 'very_consistent' if cv < 0.2 else ('consistent' if cv < 0.4 else 'variable'),
    }


def percentile_rank(player_id: str, db_path: str = DB_PATH) -> dict:
    """Rank a player against peers in their primary age group."""
    stats = load_player_stats(db_path)
    player_stats = stats[stats['player_id'] == player_id]

    if player_stats.empty:
        return None

    primary_ag = player_stats['age_group'].mode().iloc[0]
    peers = stats[stats['age_group'] == primary_ag].groupby('player_id').agg({
        'games_played': 'sum', 'total_points': 'sum', 'total_fouls': 'sum',
        'three_point': 'sum',
    }).reset_index()
    peers = peers[peers['games_played'] >= 3]

    gp = peers['games_played'].clip(lower=1)
    peers['ppg'] = peers['total_points'] / gp
    peers['fpg'] = peers['total_fouls'] / gp
    peers['fg3_pg'] = peers['three_point'] / gp

    player_row = peers[peers['player_id'] == player_id]
    if player_row.empty:
        return None

    pr = player_row.iloc[0]
    return {
        'age_group': primary_ag,
        'peer_count': len(peers),
        'ppg_percentile': int((peers['ppg'] < pr['ppg']).mean() * 100),
        'fg3_percentile': int((peers['fg3_pg'] < pr['fg3_pg']).mean() * 100),
        'discipline_percentile': int((peers['fpg'] > pr['fpg']).mean() * 100),
    }


if __name__ == "__main__":
    # Joshua Dworkin spotlight
    JOSH_ID = "f1fa18fc-a93f-45b9-ac91-f70652744dd7"
    profile = get_player_profile(JOSH_ID)
    if profile:
        print(f"\n=== {profile['name']} ===")
        print(f"Teams: {', '.join(profile['teams'])}")
        print(f"Career: {profile['career']['games_played']} GP, {profile['career']['ppg']} PPG")
        trend = scoring_trend(JOSH_ID)
        if not trend.empty:
            print(f"Trend: {trend['trend'].iloc[0]}")
        consistency = consistency_metrics(JOSH_ID)
        print(f"Consistency: {consistency['consistency_rating']}")
    else:
        print("Player not found")
