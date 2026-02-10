# FullCourtVision Analysis Pipeline

A comprehensive basketball analytics and machine learning pipeline for player archetype classification, game outcome prediction, and statistical analysis.

## 🏀 Overview

This analysis pipeline provides:
- **Player Clustering**: Classify players into basketball archetypes (Sharpshooter, Inside Scorer, etc.)
- **Game Predictions**: Predict game outcomes and point margins using team strength metrics  
- **Player Analysis**: Career statistics, scoring trends, and peer comparisons
- **Team Analysis**: Win/loss records, home/away splits, and scoring patterns
- **Data Processing**: Dual-source data loading (SQLite + Parquet fallback)

## 📊 Player Archetypes

The clustering algorithm identifies 5 distinct player types:

- 🎯 **Sharpshooter**: Relies heavily on 3-point shooting
- 💪 **Inside Scorer**: Dominates with 2-point scoring  
- 🔥 **High Volume**: High PPG, scores from everywhere
- 🛡️ **Physical**: High foul rate, aggressive play style
- ⚖️ **Balanced**: Well-rounded across all metrics

## 🚀 Quick Start

### Prerequisites

Ensure you have Python 3.8+ and install dependencies:

```bash
pip install -r requirements.txt
```

### Running the Analysis

**Complete Pipeline** (recommended for full analysis):
```bash
python run_analysis.py
```

**Simple Analysis** (faster, clustering-focused):
```bash
python run_simple_analysis.py
```

**Individual Modules** (for specific analysis):
```python
from analysis import cluster_players, train_game_predictor

# Cluster players into archetypes
clustered_df = cluster_players(min_games=5, n_clusters=5)
print(clustered_df['archetype'].value_counts())

# Train game prediction model
model = train_game_predictor()
print(f"Model accuracy: {model['accuracy']:.1%}")
```

## 📁 Project Structure

```
analysis/
├── __init__.py              # Package exports and metadata
├── requirements.txt         # Python dependencies
├── README.md               # This file
│
├── clustering.py           # Player archetype classification
├── predictions.py          # Game outcome and trend predictions  
├── player_analysis.py      # Individual player statistics
├── team_analysis.py        # Team performance analysis
├── data_loader.py          # Data access and preprocessing
│
├── run_analysis.py         # Complete analysis pipeline
├── run_simple_analysis.py  # Fast clustering-focused analysis
│
├── output/                 # Generated results and visualizations
│   ├── *.csv              # Data exports (clusters, summaries)
│   ├── *.png              # Charts and visualizations
│   ├── *.json             # Model metrics and predictions
│   └── *.md               # Analysis reports
│
└── notebooks/             # Jupyter notebooks for exploration
```

## 🔧 Core Modules

### clustering.py
**Player Archetype Classification**
- `cluster_players()`: K-means clustering on per-game statistics
- `get_player_archetype()`: Individual player archetype lookup
- `archetype_summary()`: Summary statistics by archetype

### predictions.py  
**Predictive Models**
- `scoring_trend_regression()`: Linear regression for player scoring trends
- `train_game_predictor()`: Random Forest for game outcome prediction
- `predict_matchup()`: Predict outcome between two specific teams
- `build_game_features()`: Feature engineering for game prediction

### player_analysis.py
**Individual Player Analysis** 
- `get_player_profile()`: Comprehensive career statistics
- `scoring_trend()`: Season-by-season scoring progression  
- `consistency_metrics()`: Performance consistency analysis
- `percentile_rank()`: Peer comparison within age groups

### team_analysis.py
**Team Performance Analysis**
- `team_record()`: Win/loss records and scoring averages
- `home_away_split()`: Home vs away performance comparison
- `grade_standings()`: League standings calculation
- `team_scoring_patterns()`: Roster analysis and scoring distribution

### data_loader.py
**Data Access & Processing**
- `load_player_stats()`: Player statistics with derived metrics
- `load_games()`: Game results with team context
- `aggregate_player_career()`: Career-spanning player totals
- Dual-source loading: SQLite (local) + Parquet (cloud fallback)

## 📋 Dependencies

Core requirements (see `requirements.txt`):
- **pandas** (≥2.0): Data manipulation and analysis
- **numpy** (≥1.24): Numerical computing
- **scikit-learn** (≥1.3): Machine learning algorithms
- **matplotlib** (≥3.7): Static visualizations  
- **seaborn** (≥0.12): Statistical plotting
- **plotly** (≥5.15): Interactive visualizations

Additional packages:
- **scipy** (≥1.11): Scientific computing
- **statsmodels** (≥0.14): Statistical modeling
- **jupyter** (≥1.0): Notebook environment
- **streamlit** (≥1.28): Web app framework

## 📈 Generated Outputs

The pipeline generates several types of outputs in the `output/` directory:

### Data Files
- **player_clusters_TIMESTAMP.csv**: Complete clustering results with player archetypes
- **archetype_summary_TIMESTAMP.csv**: Summary statistics by archetype
- **prediction_results_TIMESTAMP.json**: Model performance metrics

### Visualizations
- **archetype_distribution_TIMESTAMP.png**: Pie chart of player archetype distribution
- **archetype_features_TIMESTAMP.png**: Box plots comparing archetypes across stats
- **archetype_scatter_TIMESTAMP.png**: Scatter plot of PPG vs 3PT rate by archetype
- **feature_importance_TIMESTAMP.png**: Random Forest feature importance chart
- **model_performance_TIMESTAMP.png**: Model accuracy and performance metrics

### Reports  
- **analysis_report_TIMESTAMP.md**: Comprehensive analysis summary
- **ANALYSIS_SUMMARY_TIMESTAMP.md**: Key findings and insights

## 🎯 Example Results

**Player Archetype Distribution** (typical):
- Balanced: ~35% of players
- Inside Scorer: ~25% of players  
- Sharpshooter: ~20% of players
- High Volume: ~12% of players
- Physical: ~8% of players

**Game Prediction Performance**:
- Classification Accuracy: ~65-75% (varies by data quality)
- Cross-validation: Typically within 5% of test accuracy
- Feature Importance: Team win rate and average scoring are top predictors

## 🔍 Data Sources

The pipeline supports dual data sources:

1. **SQLite Database** (primary): `data/playhq.db`
   - Full relational data with joins
   - Faster query performance
   - Used when available locally

2. **Parquet Files** (fallback): `data/parquet/*.parquet`  
   - Flat file format for cloud deployment
   - Automatic fallback when SQLite unavailable
   - Individual tables as separate files

## 🧪 Development

**Running Tests**:
```bash
# Test individual modules
python -m analysis.clustering
python -m analysis.predictions
python -m analysis.player_analysis
```

**Adding New Features**:
1. Add functions to appropriate module (clustering, predictions, etc.)
2. Update `__init__.py` exports if public API
3. Add type hints and comprehensive docstrings
4. Update this README with new functionality

**Code Style**:
- Use type hints for all function parameters and returns
- Follow Google-style docstrings with Args/Returns sections  
- Import statements: standard library, third-party, local modules
- Maximum line length: 100 characters

## 🤝 Usage Examples

**Analyze a Specific Player**:
```python
from analysis import get_player_profile, get_player_archetype

# Get comprehensive profile
profile = get_player_profile("player-uuid-here")
print(f"{profile['name']}: {profile['career']['ppg']} PPG")

# Get archetype classification  
archetype = get_player_archetype("player-uuid-here")
print(f"{archetype['archetype']}: {archetype['description']}")
```

**Team Analysis**:
```python
from analysis import team_record, predict_matchup

# Analyze team performance
record = team_record("team-uuid-here")
print(f"Record: {record['wins']}W-{record['losses']}L ({record['win_pct']}%)")

# Predict matchup
prediction = predict_matchup("home-team-id", "away-team-id")
print(f"Home win probability: {prediction['home_win_prob']}%")
```

**Custom Analysis**:
```python  
from analysis import load_player_stats, cluster_players

# Load raw data
stats = load_player_stats()

# Filter and analyze subset
rookies = stats[stats['season_name'] == '2024']
rookie_clusters = cluster_players(min_games=3, n_clusters=3)
```

---

**Generated by FullCourtVision Analysis Pipeline**  
For questions or issues, see the project documentation or contact the development team.