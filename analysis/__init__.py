"""
FullCourtVision Analysis Package

A comprehensive basketball analytics pipeline for player clustering, 
game prediction, and statistical analysis.

Main modules:
- clustering: Player archetype classification using K-means
- predictions: Game outcome and scoring trend prediction models  
- player_analysis: Individual player career and performance analysis
- team_analysis: Team performance, standings, and patterns
- data_loader: Data access and preprocessing utilities

Quick start:
    >>> from analysis import cluster_players, train_game_predictor
    >>> clustered = cluster_players(min_games=5)
    >>> model = train_game_predictor()
"""

# Import key functions for easy access
from .clustering import (
    cluster_players,
    get_player_archetype, 
    archetype_summary,
    ARCHETYPE_NAMES
)

from .predictions import (
    scoring_trend_regression,
    train_game_predictor,
    predict_matchup,
    build_game_features
)

from .player_analysis import (
    get_player_profile,
    scoring_trend,
    consistency_metrics,
    percentile_rank
)

from .team_analysis import (
    team_record,
    home_away_split,
    grade_standings,
    team_scoring_patterns
)

from .data_loader import (
    load_player_stats,
    load_games,
    load_teams,
    load_players,
    load_organisations,
    aggregate_player_career,
    query,
    DB_PATH
)

# Package metadata
__version__ = "1.0.0"
__author__ = "FullCourtVision"
__description__ = "Basketball analytics and machine learning pipeline"

# Expose main analysis functions
__all__ = [
    # Clustering
    'cluster_players', 'get_player_archetype', 'archetype_summary', 'ARCHETYPE_NAMES',
    # Predictions  
    'scoring_trend_regression', 'train_game_predictor', 'predict_matchup', 'build_game_features',
    # Player Analysis
    'get_player_profile', 'scoring_trend', 'consistency_metrics', 'percentile_rank',
    # Team Analysis  
    'team_record', 'home_away_split', 'grade_standings', 'team_scoring_patterns',
    # Data Loading
    'load_player_stats', 'load_games', 'load_teams', 'load_players', 'load_organisations',
    'aggregate_player_career', 'query', 'DB_PATH'
]
