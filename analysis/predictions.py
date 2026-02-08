"""
FullCourtVision — Predictions
Linear regression for scoring trends, random forest for game outcome prediction.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, r2_score
from .data_loader import load_games, load_player_stats, query, DB_PATH


def scoring_trend_regression(player_id: str, db_path: str = DB_PATH) -> dict:
    """Fit linear regression on a player's PPG over seasons to predict trajectory."""
    stats = load_player_stats(db_path)
    player = stats[stats['player_id'] == player_id].sort_values('season_start')

    if len(player) < 2:
        return {'status': 'insufficient_data'}

    season_agg = player.groupby('season_start').agg({
        'games_played': 'sum', 'total_points': 'sum'
    }).reset_index().sort_values('season_start')

    season_agg['ppg'] = season_agg['total_points'] / season_agg['games_played'].clip(lower=1)
    X = np.arange(len(season_agg)).reshape(-1, 1)
    y = season_agg['ppg'].values

    model = LinearRegression()
    model.fit(X, y)

    next_season = len(season_agg)
    predicted_ppg = model.predict([[next_season]])[0]

    return {
        'status': 'ok',
        'slope': round(model.coef_[0], 3),
        'intercept': round(model.intercept_, 3),
        'r_squared': round(model.score(X, y), 3),
        'current_ppg': round(y[-1], 1),
        'predicted_next_ppg': round(max(predicted_ppg, 0), 1),
        'trend': 'improving' if model.coef_[0] > 0.5 else ('declining' if model.coef_[0] < -0.5 else 'stable'),
        'seasons_count': len(season_agg),
    }


def build_game_features(db_path: str = DB_PATH) -> pd.DataFrame:
    """Build feature matrix for game outcome prediction from team-level aggregates."""
    games = load_games(db_path)
    completed = games[games['status'] == 'FINAL'].copy()

    if completed.empty:
        return pd.DataFrame()

    # Build team strength features: avg scoring, win rate
    team_stats = {}
    for _, g in completed.iterrows():
        for tid, pf, pa in [(g['home_team_id'], g['home_score'], g['away_score']),
                             (g['away_team_id'], g['away_score'], g['home_score'])]:
            if tid not in team_stats:
                team_stats[tid] = {'pf': [], 'pa': [], 'wins': 0, 'games': 0}
            team_stats[tid]['pf'].append(pf)
            team_stats[tid]['pa'].append(pa)
            team_stats[tid]['games'] += 1
            if pf > pa:
                team_stats[tid]['wins'] += 1

    # Convert to features
    team_features = {}
    for tid, s in team_stats.items():
        gp = max(s['games'], 1)
        team_features[tid] = {
            'avg_pf': np.mean(s['pf']),
            'avg_pa': np.mean(s['pa']),
            'win_rate': s['wins'] / gp,
            'games': gp,
            'scoring_std': np.std(s['pf']),
        }

    # Build game-level features
    rows = []
    for _, g in completed.iterrows():
        ht = team_features.get(g['home_team_id'])
        at = team_features.get(g['away_team_id'])
        if not ht or not at or ht['games'] < 3 or at['games'] < 3:
            continue

        rows.append({
            'home_avg_pf': ht['avg_pf'], 'home_avg_pa': ht['avg_pa'],
            'home_win_rate': ht['win_rate'], 'home_scoring_std': ht['scoring_std'],
            'away_avg_pf': at['avg_pf'], 'away_avg_pa': at['avg_pa'],
            'away_win_rate': at['win_rate'], 'away_scoring_std': at['scoring_std'],
            'home_win': 1 if g['home_score'] > g['away_score'] else 0,
            'margin': g['home_score'] - g['away_score'],
        })

    return pd.DataFrame(rows)


def train_game_predictor(db_path: str = DB_PATH) -> dict:
    """Train a Random Forest to predict game outcomes. Returns model + metrics."""
    df = build_game_features(db_path)
    if len(df) < 50:
        return {'status': 'insufficient_data'}

    feature_cols = ['home_avg_pf', 'home_avg_pa', 'home_win_rate', 'home_scoring_std',
                    'away_avg_pf', 'away_avg_pa', 'away_win_rate', 'away_scoring_std']

    X = df[feature_cols].values
    y_class = df['home_win'].values
    y_margin = df['margin'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y_class, test_size=0.2, random_state=42)

    # Classification: home win / away win
    clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    cv_scores = cross_val_score(clf, X, y_class, cv=5, scoring='accuracy')

    # Regression: margin
    reg = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_margin, test_size=0.2, random_state=42)
    reg.fit(X_train_r, y_train_r)
    r2 = r2_score(y_test_r, reg.predict(X_test_r))

    # Feature importance
    importance = dict(zip(feature_cols, clf.feature_importances_.round(4).tolist()))

    return {
        'status': 'ok',
        'classifier': clf,
        'regressor': reg,
        'feature_cols': feature_cols,
        'accuracy': round(acc, 3),
        'cv_accuracy': round(cv_scores.mean(), 3),
        'cv_std': round(cv_scores.std(), 3),
        'r2_margin': round(r2, 3),
        'feature_importance': importance,
        'training_samples': len(X_train),
        'test_samples': len(X_test),
    }


def predict_matchup(home_team_id: str, away_team_id: str, model_result: dict = None,
                    db_path: str = DB_PATH) -> dict:
    """Predict outcome of a matchup between two teams."""
    if model_result is None or model_result.get('status') != 'ok':
        model_result = train_game_predictor(db_path)

    if model_result.get('status') != 'ok':
        return {'status': 'model_unavailable'}

    # Get team features
    games = load_games(db_path)
    completed = games[games['status'] == 'FINAL']

    def team_feat(tid):
        home_g = completed[completed['home_team_id'] == tid]
        away_g = completed[completed['away_team_id'] == tid]
        pf = list(home_g['home_score']) + list(away_g['away_score'])
        pa = list(home_g['away_score']) + list(away_g['home_score'])
        if len(pf) < 3:
            return None
        wins = sum(1 for f, a in zip(pf, pa) if f > a)
        return {
            'avg_pf': np.mean(pf), 'avg_pa': np.mean(pa),
            'win_rate': wins / len(pf), 'scoring_std': np.std(pf),
        }

    ht = team_feat(home_team_id)
    at = team_feat(away_team_id)

    if not ht or not at:
        return {'status': 'insufficient_team_data'}

    X = np.array([[ht['avg_pf'], ht['avg_pa'], ht['win_rate'], ht['scoring_std'],
                   at['avg_pf'], at['avg_pa'], at['win_rate'], at['scoring_std']]])

    clf = model_result['classifier']
    reg = model_result['regressor']

    prob = clf.predict_proba(X)[0]
    margin = reg.predict(X)[0]

    return {
        'status': 'ok',
        'home_win_prob': round(float(prob[1]) * 100, 1) if len(prob) > 1 else 50.0,
        'away_win_prob': round(float(prob[0]) * 100, 1) if len(prob) > 1 else 50.0,
        'predicted_margin': round(float(margin), 1),
        'home_avg_score': round(ht['avg_pf'], 1),
        'away_avg_score': round(at['avg_pf'], 1),
    }


if __name__ == "__main__":
    print("Training game predictor...")
    result = train_game_predictor()
    if result['status'] == 'ok':
        print(f"Accuracy: {result['accuracy']}")
        print(f"CV Accuracy: {result['cv_accuracy']} ± {result['cv_std']}")
        print(f"Margin R²: {result['r2_margin']}")
        print(f"Feature importance: {result['feature_importance']}")
    else:
        print("Insufficient data")
