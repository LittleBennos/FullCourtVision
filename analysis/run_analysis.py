"""
FullCourtVision — Analysis Runner
Execute clustering and prediction models, save results and visualizations.
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix
import json
from datetime import datetime

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import with absolute imports
import clustering
import predictions
import data_loader

# Set paths
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")

def save_clustering_analysis():
    """Run player clustering and save results + visualizations."""
    print("Running player clustering analysis...")
    
    # Cluster players
    clustered_df = clustering.cluster_players(min_games=5, n_clusters=5)
    summary = clustering.archetype_summary(clustered_df)
    
    print(f"Clustered {len(clustered_df):,} players into 5 archetypes")
    
    # Save results
    clustered_df.to_csv(os.path.join(OUTPUT_DIR, f"player_clusters_{TIMESTAMP}.csv"), index=False)
    summary.to_csv(os.path.join(OUTPUT_DIR, f"archetype_summary_{TIMESTAMP}.csv"), index=False)
    
    # Create visualizations
    plt.style.use('default')
    
    # 1. Cluster distribution pie chart
    plt.figure(figsize=(10, 8))
    counts = clustered_df['archetype'].value_counts()
    colors = [clustering.ARCHETYPE_NAMES[arch]['color'] for arch in counts.index]
    plt.pie(counts.values, labels=[f"{arch}\n({count} players)" for arch, count in counts.items()], 
            colors=colors, autopct='%1.1f%%', startangle=90)
    plt.title(f"Player Archetype Distribution\n({len(clustered_df):,} players with ≥5 games)", fontsize=14, pad=20)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, f"archetype_distribution_{TIMESTAMP}.png"), dpi=300, bbox_inches='tight')
    plt.close()
    
    # 2. Feature comparison across archetypes
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    axes = axes.flatten()
    
    features = ['ppg', 'fg3_pg', 'fg2_pg', 'ft_pg', 'fpg']
    feature_names = ['Points per Game', '3-Pointers per Game', '2-Pointers per Game', 
                     'Free Throws per Game', 'Fouls per Game']
    
    for i, (feat, name) in enumerate(zip(features, feature_names)):
        sns.boxplot(data=clustered_df, x='archetype', y=feat, ax=axes[i])
        axes[i].set_title(name)
        axes[i].set_xlabel('')
        axes[i].tick_params(axis='x', rotation=45)
    
    # Remove the 6th subplot
    fig.delaxes(axes[5])
    
    plt.suptitle('Player Statistics by Archetype', fontsize=16, y=0.98)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, f"archetype_features_{TIMESTAMP}.png"), dpi=300, bbox_inches='tight')
    plt.close()
    
    # 3. Scatter plot: PPG vs 3PT rate by archetype
    plt.figure(figsize=(12, 8))
    for archetype in clustered_df['archetype'].unique():
        data = clustered_df[clustered_df['archetype'] == archetype]
        plt.scatter(data['fg3_pg'], data['ppg'], 
                   label=f"{archetype} ({len(data)})",
                   alpha=0.7, s=50, 
                   c=clustering.ARCHETYPE_NAMES[archetype]['color'])
    
    plt.xlabel('3-Pointers per Game')
    plt.ylabel('Points per Game')
    plt.title('Player Archetypes: Scoring vs 3-Point Rate')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, f"archetype_scatter_{TIMESTAMP}.png"), dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"[OK] Clustering analysis complete. Results saved to output/")
    return clustered_df, summary

def save_prediction_analysis():
    """Run game prediction model and save results + metrics."""
    print("Training game prediction models...")
    
    # Train model
    model_result = predictions.train_game_predictor()
    
    if model_result.get('status') != 'ok':
        print("[X] Insufficient data for prediction model")
        return None
    
    print(f"Model accuracy: {model_result['accuracy']}")
    print(f"CV accuracy: {model_result['cv_accuracy']} ± {model_result['cv_std']}")
    print(f"Margin prediction R²: {model_result['r2_margin']}")
    
    # Save model metrics
    metrics = {
        'timestamp': datetime.now().isoformat(),
        'model_type': 'RandomForest',
        'accuracy': model_result['accuracy'],
        'cv_accuracy': model_result['cv_accuracy'],
        'cv_std': model_result['cv_std'],
        'r2_margin': model_result['r2_margin'],
        'feature_importance': model_result['feature_importance'],
        'training_samples': model_result['training_samples'],
        'test_samples': model_result['test_samples'],
    }
    
    with open(os.path.join(OUTPUT_DIR, f"model_metrics_{TIMESTAMP}.json"), 'w') as f:
        json.dump(metrics, f, indent=2)
    
    # Create visualizations
    # 1. Feature importance chart
    plt.figure(figsize=(10, 6))
    importance = model_result['feature_importance']
    features = list(importance.keys())
    values = list(importance.values())
    
    # Clean feature names
    clean_names = []
    for feat in features:
        if 'home_' in feat:
            clean_names.append(f"Home {feat.replace('home_', '').replace('_', ' ').title()}")
        elif 'away_' in feat:
            clean_names.append(f"Away {feat.replace('away_', '').replace('_', ' ').title()}")
        else:
            clean_names.append(feat.replace('_', ' ').title())
    
    plt.barh(clean_names, values)
    plt.xlabel('Feature Importance')
    plt.title('Random Forest Feature Importance\nGame Outcome Prediction')
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, f"feature_importance_{TIMESTAMP}.png"), dpi=300, bbox_inches='tight')
    plt.close()
    
    # 2. Model performance summary chart
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    # Accuracy metrics
    metrics_df = pd.DataFrame({
        'Metric': ['Test Accuracy', 'CV Mean', 'CV - 1 Std', 'CV + 1 Std'],
        'Value': [
            model_result['accuracy'],
            model_result['cv_accuracy'],
            model_result['cv_accuracy'] - model_result['cv_std'],
            model_result['cv_accuracy'] + model_result['cv_std']
        ]
    })
    
    ax1.bar(metrics_df['Metric'], metrics_df['Value'], color=['#e74c3c', '#3498db', '#95a5a6', '#95a5a6'])
    ax1.set_ylabel('Accuracy')
    ax1.set_title('Model Performance Metrics')
    ax1.set_ylim(0, 1)
    for i, v in enumerate(metrics_df['Value']):
        ax1.text(i, v + 0.02, f'{v:.3f}', ha='center')
    
    # R² for margin prediction
    ax2.bar(['Margin Prediction R²'], [model_result['r2_margin']], color='#2ecc71')
    ax2.set_ylabel('R² Score')
    ax2.set_title('Margin Prediction Performance')
    ax2.set_ylim(0, 1)
    ax2.text(0, model_result['r2_margin'] + 0.02, f"{model_result['r2_margin']:.3f}", ha='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, f"model_performance_{TIMESTAMP}.png"), dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"[OK] Prediction analysis complete. Results saved to output/")
    return model_result

def generate_summary_report(clustered_df, summary, model_result):
    """Generate a summary report of the analysis."""
    report = []
    report.append("# FullCourtVision ML Analysis Report")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Data overview
    stats = data_loader.load_player_stats()
    games = data_loader.load_games()
    career = data_loader.aggregate_player_career(stats)
    
    report.append("## Data Overview")
    report.append(f"- Total player stat records: {len(stats):,}")
    report.append(f"- Total games: {len(games):,}")
    report.append(f"- Unique players: {len(career):,}")
    report.append("")
    
    # Clustering results
    report.append("## Player Archetype Clustering")
    report.append(f"- Algorithm: K-Means (k=5)")
    report.append(f"- Players analyzed: {len(clustered_df):,} (≥5 games)")
    report.append("")
    
    for _, row in summary.iterrows():
        archetype = row['archetype']
        count = row['count']
        icon = clustering.ARCHETYPE_NAMES[archetype]['icon']
        desc = clustering.ARCHETYPE_NAMES[archetype]['desc']
        report.append(f"**{icon} {archetype}** ({count} players): {desc}")
        report.append(f"  - Avg PPG: {row['avg_ppg']:.1f}")
        report.append(f"  - Avg 3PT/G: {row['avg_fg3']:.1f}")
        report.append(f"  - Avg 2PT/G: {row['avg_fg2']:.1f}")
        report.append("")
    
    # Prediction model results
    if model_result and model_result.get('status') == 'ok':
        report.append("## Game Outcome Prediction")
        report.append(f"- Algorithm: Random Forest")
        report.append(f"- Training samples: {model_result['training_samples']:,}")
        report.append(f"- Test samples: {model_result['test_samples']:,}")
        report.append(f"- Test Accuracy: {model_result['accuracy']:.1%}")
        report.append(f"- Cross-validation: {model_result['cv_accuracy']:.1%} ± {model_result['cv_std']:.1%}")
        report.append(f"- Margin prediction R²: {model_result['r2_margin']:.3f}")
        report.append("")
        
        report.append("### Top Features")
        importance = model_result['feature_importance']
        for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]:
            report.append(f"- {feat.replace('_', ' ').title()}: {imp:.3f}")
        report.append("")
    else:
        report.append("## Game Outcome Prediction")
        report.append("- Status: Insufficient data for training")
        report.append("")
    
    # Files generated
    report.append("## Generated Files")
    for filename in os.listdir(OUTPUT_DIR):
        if TIMESTAMP in filename:
            report.append(f"- {filename}")
    
    # Save report
    report_text = "\n".join(report)
    with open(os.path.join(OUTPUT_DIR, f"analysis_report_{TIMESTAMP}.md"), 'w') as f:
        f.write(report_text)
    
    print("Summary report generated")
    return report_text

def main():
    """Run complete analysis pipeline."""
    print("Starting FullCourtVision ML Analysis Pipeline")
    print("=" * 50)
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Run analyses
    clustered_df, summary = save_clustering_analysis()
    model_result = save_prediction_analysis()
    
    # Generate summary report
    report = generate_summary_report(clustered_df, summary, model_result)
    
    print("\n" + "=" * 50)
    print("[OK] Analysis pipeline complete!")
    print(f"Results saved to: {OUTPUT_DIR}")
    print(f"Files generated with timestamp: {TIMESTAMP}")

if __name__ == "__main__":
    main()