"""
FullCourtVision — Player Clustering
K-means clustering of player types (Sharpshooter, Inside Scorer, etc.)
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import Dict, Union, Optional
from data_loader import load_player_stats, DB_PATH


ARCHETYPE_NAMES = {
    "Sharpshooter": {"icon": "🎯", "color": "#ffc300", "desc": "Relies heavily on 3-point shooting"},
    "Inside Scorer": {"icon": "💪", "color": "#e94560", "desc": "Dominates with 2-point scoring"},
    "High Volume": {"icon": "🔥", "color": "#00d2ff", "desc": "High PPG, scores from everywhere"},
    "Physical": {"icon": "🛡️", "color": "#7b2ff7", "desc": "High foul rate, aggressive play style"},
    "Balanced": {"icon": "⚖️", "color": "#2ecc71", "desc": "Well-rounded across all metrics"},
}

FEATURE_COLS = ['ppg', 'ft_pg', 'fg2_pg', 'fg3_pg', 'fpg']


def cluster_players(min_games: int = 5, n_clusters: int = 5, db_path: str = DB_PATH) -> pd.DataFrame:
    """Cluster players into basketball archetypes using K-means on per-game stats.
    
    Applies K-means clustering to player statistics (PPG, shot types, fouls) to
    identify distinct playing styles. Automatically assigns meaningful archetype
    names based on cluster characteristics.
    
    Args:
        min_games (int): Minimum games played to include player in analysis
        n_clusters (int): Number of clusters for K-means (default 5 for 5 archetypes)
        db_path (str): Path to the SQLite database file
        
    Returns:
        pd.DataFrame: Clustered players with columns:
            - player_id: Unique player identifier
            - first_name, last_name: Player names
            - games_played: Total games played
            - ppg, ft_pg, fg2_pg, fg3_pg, fpg: Per-game statistics  
            - cluster: Numeric cluster assignment (0-4)
            - archetype: Named archetype (Sharpshooter, Inside Scorer, etc.)
            - player_name: Full name (first + last)
    """
    stats = load_player_stats()

    # Aggregate per player
    agg = stats.groupby(['player_id', 'first_name', 'last_name']).agg({
        'games_played': 'sum', 'total_points': 'sum',
        'one_point': 'sum', 'two_point': 'sum', 'three_point': 'sum',
        'total_fouls': 'sum',
    }).reset_index()

    agg = agg[agg['games_played'] >= min_games].copy()
    gp = agg['games_played'].clip(lower=1)
    agg['ppg'] = agg['total_points'] / gp
    agg['ft_pg'] = agg['one_point'] / gp
    agg['fg2_pg'] = agg['two_point'] / gp
    agg['fg3_pg'] = agg['three_point'] / gp
    agg['fpg'] = agg['total_fouls'] / gp
    agg['player_name'] = agg['first_name'] + ' ' + agg['last_name']

    X = agg[FEATURE_COLS].fillna(0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    agg['cluster'] = kmeans.fit_predict(X_scaled)

    # Assign archetype names based on cluster characteristics
    cluster_means = agg.groupby('cluster')[FEATURE_COLS].mean()
    assigned = {}
    remaining = set(range(n_clusters))

    # High Volume = highest ppg
    c = cluster_means['ppg'].idxmax()
    assigned[c] = "High Volume"
    remaining.discard(c)

    # Sharpshooter = highest fg3_pg
    c = cluster_means.loc[list(remaining), 'fg3_pg'].idxmax()
    assigned[c] = "Sharpshooter"
    remaining.discard(c)

    # Physical = highest fpg
    c = cluster_means.loc[list(remaining), 'fpg'].idxmax()
    assigned[c] = "Physical"
    remaining.discard(c)

    # Inside Scorer = highest fg2_pg
    c = cluster_means.loc[list(remaining), 'fg2_pg'].idxmax()
    assigned[c] = "Inside Scorer"
    remaining.discard(c)

    # Balanced = remaining
    for c in remaining:
        assigned[c] = "Balanced"

    agg['archetype'] = agg['cluster'].map(assigned)
    return agg


def get_player_archetype(player_id: str, clustered_df: Optional[pd.DataFrame] = None,
                         db_path: str = DB_PATH) -> Optional[Dict[str, Union[str, Dict]]]:
    """Get a specific player's archetype information and statistics.
    
    Returns detailed archetype information for a single player including
    their classification, description, visual styling, and key statistics.
    
    Args:
        player_id (str): Unique identifier for the player
        clustered_df (Optional[pd.DataFrame]): Pre-computed clustering results.
                                              If None, will run clustering automatically.
        db_path (str): Path to the SQLite database file
        
    Returns:
        Optional[Dict[str, Union[str, Dict]]]: Player archetype information including:
            - player_name: Full player name
            - archetype: Archetype name (e.g., "Sharpshooter")
            - icon: Emoji icon for the archetype
            - color: Hex color code for visualization
            - description: Text description of the archetype
            - stats: Dictionary of key per-game statistics
        Returns None if player not found in clustering results.
    """
    if clustered_df is None:
        clustered_df = cluster_players()

    row = clustered_df[clustered_df['player_id'] == player_id]
    if row.empty:
        return None

    r = row.iloc[0]
    arch = r['archetype']
    info = ARCHETYPE_NAMES[arch]

    return {
        'player_name': r['player_name'],
        'archetype': arch,
        'icon': info['icon'],
        'color': info['color'],
        'description': info['desc'],
        'stats': {c: round(r[c], 2) for c in FEATURE_COLS},
    }


def archetype_summary(clustered_df: Optional[pd.DataFrame] = None, db_path: str = DB_PATH) -> pd.DataFrame:
    """Generate summary statistics for each player archetype.
    
    Computes aggregate statistics across all players in each archetype to
    understand the defining characteristics of each cluster.
    
    Args:
        clustered_df (Optional[pd.DataFrame]): Pre-computed clustering results.
                                              If None, will run clustering automatically.
        db_path (str): Path to the SQLite database file
        
    Returns:
        pd.DataFrame: Summary statistics with columns:
            - archetype: Archetype name
            - count: Number of players in archetype  
            - avg_ppg: Average points per game
            - avg_fg3: Average 3-pointers per game
            - avg_fg2: Average 2-pointers per game
            - avg_ft: Average free throws per game
            - avg_fpg: Average fouls per game
    """
    if clustered_df is None:
        clustered_df = cluster_players()

    summary = clustered_df.groupby('archetype').agg(
        count=('player_id', 'count'),
        avg_ppg=('ppg', 'mean'),
        avg_fg3=('fg3_pg', 'mean'),
        avg_fg2=('fg2_pg', 'mean'),
        avg_ft=('ft_pg', 'mean'),
        avg_fpg=('fpg', 'mean'),
    ).round(2).reset_index()

    return summary


if __name__ == "__main__":
    print("Clustering players...")
    df = cluster_players()
    print(f"\nClustered {len(df):,} players into archetypes:")
    summary = archetype_summary(df)
    print(summary.to_string(index=False))

    # Joshua Dworkin
    JOSH_ID = "f1fa18fc-a93f-45b9-ac91-f70652744dd7"
    josh = get_player_archetype(JOSH_ID, df)
    if josh:
        print(f"\n{josh['icon']} Joshua Dworkin: {josh['archetype']} — {josh['description']}")
        print(f"Stats: {josh['stats']}")
