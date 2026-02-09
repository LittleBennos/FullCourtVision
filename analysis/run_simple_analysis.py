"""
Simple analysis runner - clustering only with basic prediction attempt
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
from datetime import datetime

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import clustering
import predictions
import data_loader

# Set paths
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")

def main():
    """Run simple analysis with error handling."""
    print("Starting Simple FullCourtVision Analysis")
    print("=" * 40)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Run clustering
    print("Running clustering...")
    try:
        clustered_df = clustering.cluster_players(min_games=5, n_clusters=5)
        summary = clustering.archetype_summary(clustered_df)
        
        print(f"Successfully clustered {len(clustered_df):,} players")
        
        # Save clustering results
        clustered_df.to_csv(os.path.join(OUTPUT_DIR, f"player_clusters_simple_{TIMESTAMP}.csv"), index=False)
        summary.to_csv(os.path.join(OUTPUT_DIR, f"archetype_summary_simple_{TIMESTAMP}.csv"), index=False)
        
        print("Archetype Distribution:")
        print(clustered_df['archetype'].value_counts())
        
    except Exception as e:
        print(f"Clustering failed: {e}")
        return
    
    # Try prediction model with error handling
    print("\nTrying prediction model...")
    try:
        # Build features first to check data quality
        game_features = predictions.build_game_features()
        print(f"Built features for {len(game_features)} games")
        
        if len(game_features) > 50:
            # Check for NaN values and handle them
            print("Checking for missing values...")
            nan_counts = game_features.isnull().sum()
            if nan_counts.sum() > 0:
                print("Found NaN values - cleaning...")
                game_features = game_features.dropna()
                print(f"After cleaning: {len(game_features)} games")
            
            if len(game_features) > 50:
                # Manually train a simpler model
                feature_cols = ['home_avg_pf', 'home_avg_pa', 'home_win_rate', 'home_scoring_std',
                              'away_avg_pf', 'away_avg_pa', 'away_win_rate', 'away_scoring_std']
                
                X = game_features[feature_cols].values
                y = game_features['home_win'].values
                
                from sklearn.ensemble import RandomForestClassifier
                from sklearn.model_selection import train_test_split, cross_val_score
                from sklearn.metrics import accuracy_score
                
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                
                clf = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
                clf.fit(X_train, y_train)
                
                y_pred = clf.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                
                cv_scores = cross_val_score(clf, X, y, cv=3, scoring='accuracy')
                
                print(f"Prediction model trained successfully!")
                print(f"Test Accuracy: {accuracy:.3f}")
                print(f"CV Accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
                
                # Save results
                results = {
                    'timestamp': datetime.now().isoformat(),
                    'model_type': 'RandomForestClassifier',
                    'training_samples': len(X_train),
                    'test_samples': len(X_test),
                    'accuracy': accuracy,
                    'cv_mean': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'feature_importance': dict(zip(feature_cols, clf.feature_importances_))
                }
                
                with open(os.path.join(OUTPUT_DIR, f"prediction_results_simple_{TIMESTAMP}.json"), 'w') as f:
                    json.dump(results, f, indent=2)
                
            else:
                print("Insufficient clean data for prediction model")
        else:
            print("Insufficient data for prediction model")
            
    except Exception as e:
        print(f"Prediction model failed: {e}")
    
    # Generate summary
    stats = data_loader.load_player_stats()
    games = data_loader.load_games()
    career = data_loader.aggregate_player_career(stats)
    
    print("\n" + "=" * 40)
    print("ANALYSIS SUMMARY")
    print("=" * 40)
    print(f"Total player stat records: {len(stats):,}")
    print(f"Total games: {len(games):,}")
    print(f"Unique players: {len(career):,}")
    print(f"Players clustered: {len(clustered_df):,}")
    print("\nPlayer Archetypes:")
    for archetype, count in clustered_df['archetype'].value_counts().items():
        pct = count / len(clustered_df) * 100
        print(f"  {archetype}: {count:,} players ({pct:.1f}%)")
    
    print(f"\nResults saved to: {OUTPUT_DIR}")
    print("Analysis complete!")

if __name__ == "__main__":
    main()