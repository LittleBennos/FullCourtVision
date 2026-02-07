"""
FullCourtVision - EDJBA Player Analysis Pipeline
Connects to playhq.db, computes descriptive stats, linear regression, and K-means clustering.
Outputs charts and summaries to analysis_output/
"""

import os
import sqlite3
import warnings
import json

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from scipy import stats

warnings.filterwarnings("ignore")

# --- Config ---
DB_PATHS = [
    r"C:\Users\ben\.openclaw\workspace\playhq.db",
    r"C:\Projects\FullCourtVision\data\playhq.db",
]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analysis_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_db_path():
    for p in DB_PATHS:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"playhq.db not found in: {DB_PATHS}")

def load_data(db_path):
    """Load player stats joined with player names, aggregated per player."""
    conn = sqlite3.connect(db_path)
    
    # Each row in player_stats is a player's stats for one grade/season.
    # Aggregate across all grades to get career totals.
    query = """
    SELECT
        p.id as player_id,
        p.first_name || ' ' || p.last_name as player_name,
        SUM(ps.games_played) as games_played,
        SUM(ps.total_points) as total_points,
        SUM(ps.one_point) as free_throws_made,
        SUM(ps.two_point) as two_pt_made,
        SUM(ps.three_point) as three_pt_made,
        SUM(ps.total_fouls) as total_fouls,
        COUNT(DISTINCT ps.grade_id) as seasons_played
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    GROUP BY p.id
    HAVING SUM(ps.games_played) > 0
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Derived metrics
    df["ppg"] = df["total_points"] / df["games_played"]
    df["fpg"] = df["total_fouls"] / df["games_played"]
    
    # Shooting attempts (estimate): 1pt = free throws, 2pt field goals, 3pt field goals
    # We only have makes, not attempts. Use makes as proxy for volume.
    df["two_pt_attempts"] = df["two_pt_made"]   # proxy - we only have makes
    df["three_pt_attempts"] = df["three_pt_made"]  # proxy
    
    # Shooting percentage proxy: points efficiency = total_points / (FT + 2PT + 3PT makes) if > 0
    total_makes = df["free_throws_made"] + df["two_pt_made"] + df["three_pt_made"]
    df["shot_efficiency"] = np.where(total_makes > 0, df["total_points"] / total_makes, 0)
    
    # Scoring mix
    df["pct_from_3pt"] = np.where(
        df["total_points"] > 0,
        (df["three_pt_made"] * 3) / df["total_points"] * 100,
        0
    )
    
    return df


def descriptive_stats(df):
    """Basic descriptive statistics."""
    print("\n" + "="*60)
    print("DESCRIPTIVE STATISTICS")
    print("="*60)
    
    print(f"\nTotal players analyzed: {len(df):,}")
    print(f"Total games in dataset: {df['games_played'].sum():,.0f}")
    print(f"Total points scored: {df['total_points'].sum():,.0f}")
    
    summary_cols = ["games_played", "total_points", "ppg", "total_fouls", "fpg", 
                    "free_throws_made", "two_pt_made", "three_pt_made", "shot_efficiency"]
    summary = df[summary_cols].describe().round(2)
    print("\n", summary)
    
    # Save summary
    summary.to_csv(os.path.join(OUTPUT_DIR, "descriptive_stats.csv"))
    
    # --- Chart: Distribution of PPG ---
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle("EDJBA Player Statistics Overview", fontsize=14, fontweight="bold")
    
    # PPG distribution
    ax = axes[0, 0]
    df_nonzero = df[df["ppg"] > 0]
    ax.hist(df_nonzero["ppg"], bins=50, color="#2196F3", edgecolor="white", alpha=0.8)
    ax.set_title("Points Per Game Distribution")
    ax.set_xlabel("PPG")
    ax.set_ylabel("Players")
    ax.axvline(df_nonzero["ppg"].median(), color="red", linestyle="--", label=f'Median: {df_nonzero["ppg"].median():.1f}')
    ax.legend()
    
    # FPG distribution
    ax = axes[0, 1]
    ax.hist(df["fpg"], bins=40, color="#FF9800", edgecolor="white", alpha=0.8)
    ax.set_title("Fouls Per Game Distribution")
    ax.set_xlabel("FPG")
    ax.set_ylabel("Players")
    ax.axvline(df["fpg"].median(), color="red", linestyle="--", label=f'Median: {df["fpg"].median():.1f}')
    ax.legend()
    
    # Scoring breakdown (top 50 scorers)
    ax = axes[1, 0]
    top50 = df.nlargest(50, "total_points")
    x_idx = range(len(top50))
    ax.bar(x_idx, top50["free_throws_made"], label="Free Throws", color="#4CAF50")
    ax.bar(x_idx, top50["two_pt_made"] * 2, bottom=top50["free_throws_made"], label="2PT Points", color="#2196F3")
    ax.bar(x_idx, top50["three_pt_made"] * 3, 
           bottom=top50["free_throws_made"] + top50["two_pt_made"] * 2,
           label="3PT Points", color="#F44336")
    ax.set_title("Scoring Breakdown - Top 50 Scorers")
    ax.set_xlabel("Player Rank")
    ax.set_ylabel("Points")
    ax.legend(fontsize=8)
    
    # PPG vs FPG scatter
    ax = axes[1, 1]
    sample = df[df["games_played"] >= 5].sample(min(2000, len(df[df["games_played"] >= 5])), random_state=42)
    ax.scatter(sample["ppg"], sample["fpg"], alpha=0.3, s=10, color="#9C27B0")
    ax.set_title("PPG vs FPG (5+ games)")
    ax.set_xlabel("Points Per Game")
    ax.set_ylabel("Fouls Per Game")
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "descriptive_overview.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print("\nSaved: descriptive_overview.png")
    
    # Top scorers table
    top20 = df.nlargest(20, "ppg")[df["games_played"] >= 5].head(20)
    top20_display = top20[["player_name", "games_played", "total_points", "ppg", "fpg", "two_pt_made", "three_pt_made"]].round(2)
    top20_display.to_csv(os.path.join(OUTPUT_DIR, "top20_scorers.csv"), index=False)
    print("\nTop 20 PPG (min 5 games):")
    print(top20_display.to_string(index=False))


def regression_analysis(df):
    """Linear regression: predict total points from 2PT makes, 3PT makes, games played."""
    print("\n" + "="*60)
    print("LINEAR REGRESSION - Predicting Total Points")
    print("="*60)
    
    # Filter to players with meaningful data
    reg_df = df[df["games_played"] >= 3].copy()
    
    features = ["two_pt_made", "three_pt_made", "games_played"]
    target = "total_points"
    
    X = reg_df[features].values
    y = reg_df[target].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    y_pred = model.predict(X)
    r2 = model.score(X, y)
    
    print(f"\nR² Score: {r2:.4f}")
    print(f"Intercept: {model.intercept_:.4f}")
    for feat, coef in zip(features, model.coef_):
        print(f"  {feat}: {coef:.4f}")
    
    # Interpretation
    print(f"\nInterpretation:")
    print(f"  Each additional 2PT make contributes ~{model.coef_[0]:.2f} points (expected ~2)")
    print(f"  Each additional 3PT make contributes ~{model.coef_[1]:.2f} points (expected ~3)")
    print(f"  Each additional game played contributes ~{model.coef_[2]:.2f} points")
    
    # Save results
    results = {
        "r2": round(r2, 4),
        "intercept": round(model.intercept_, 4),
        "coefficients": {f: round(c, 4) for f, c in zip(features, model.coef_)},
        "n_players": len(reg_df)
    }
    with open(os.path.join(OUTPUT_DIR, "regression_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    
    # Chart: Actual vs Predicted
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    ax = axes[0]
    ax.scatter(y, y_pred, alpha=0.2, s=8, color="#2196F3")
    max_val = max(y.max(), y_pred.max())
    ax.plot([0, max_val], [0, max_val], "r--", linewidth=1, label="Perfect prediction")
    ax.set_title(f"Actual vs Predicted Total Points (R²={r2:.3f})")
    ax.set_xlabel("Actual Points")
    ax.set_ylabel("Predicted Points")
    ax.legend()
    
    # Residuals
    ax = axes[1]
    residuals = y - y_pred
    ax.hist(residuals, bins=60, color="#FF9800", edgecolor="white", alpha=0.8)
    ax.set_title("Residual Distribution")
    ax.set_xlabel("Residual (Actual - Predicted)")
    ax.set_ylabel("Count")
    ax.axvline(0, color="red", linestyle="--")
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "regression_analysis.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print("Saved: regression_analysis.png")


def clustering_analysis(df):
    """K-means clustering: 3 clusters based on PPG, FPG, shot_efficiency."""
    print("\n" + "="*60)
    print("K-MEANS CLUSTERING (3 Clusters)")
    print("="*60)
    
    # Filter to players with enough data for meaningful clustering
    cluster_df = df[df["games_played"] >= 5].copy()
    
    cluster_features = ["ppg", "fpg", "shot_efficiency"]
    X_raw = cluster_df[cluster_features].values
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)
    
    # K-means
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    cluster_df["cluster"] = kmeans.fit_predict(X_scaled)
    
    # Cluster summaries
    cluster_names = {}
    cluster_summary = cluster_df.groupby("cluster")[
        ["ppg", "fpg", "shot_efficiency", "games_played", "total_points"]
    ].agg(["mean", "count"]).round(2)
    
    print("\nCluster Summary:")
    for c in sorted(cluster_df["cluster"].unique()):
        subset = cluster_df[cluster_df["cluster"] == c]
        avg_ppg = subset["ppg"].mean()
        avg_fpg = subset["fpg"].mean()
        avg_eff = subset["shot_efficiency"].mean()
        
        # Auto-label clusters
        if avg_ppg > cluster_df["ppg"].median() * 1.5:
            label = "High Scorers"
        elif avg_ppg < cluster_df["ppg"].median() * 0.5:
            label = "Low Volume"
        else:
            label = "Mid-Range"
        cluster_names[c] = label
        
        print(f"\n  Cluster {c} ({label}):")
        print(f"    Players: {len(subset)}")
        print(f"    Avg PPG: {avg_ppg:.2f}")
        print(f"    Avg FPG: {avg_fpg:.2f}")
        print(f"    Avg Shot Efficiency: {avg_eff:.2f}")
        print(f"    Avg Games: {subset['games_played'].mean():.1f}")
    
    # Save cluster assignments
    cluster_export = cluster_df[["player_name", "games_played", "ppg", "fpg", "shot_efficiency", "cluster"]].copy()
    cluster_export["cluster_label"] = cluster_export["cluster"].map(cluster_names)
    cluster_export.to_csv(os.path.join(OUTPUT_DIR, "player_clusters.csv"), index=False)
    
    # Chart: 2D scatter (PPG vs FPG colored by cluster)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    colors = ["#2196F3", "#FF9800", "#4CAF50"]
    
    ax = axes[0]
    for c in sorted(cluster_df["cluster"].unique()):
        subset = cluster_df[cluster_df["cluster"] == c]
        ax.scatter(subset["ppg"], subset["fpg"], 
                   alpha=0.4, s=15, color=colors[c % 3],
                   label=f"{cluster_names.get(c, c)} (n={len(subset)})")
    ax.set_title("Player Clusters: PPG vs FPG")
    ax.set_xlabel("Points Per Game")
    ax.set_ylabel("Fouls Per Game")
    ax.legend(fontsize=9)
    
    ax = axes[1]
    for c in sorted(cluster_df["cluster"].unique()):
        subset = cluster_df[cluster_df["cluster"] == c]
        ax.scatter(subset["ppg"], subset["shot_efficiency"],
                   alpha=0.4, s=15, color=colors[c % 3],
                   label=f"{cluster_names.get(c, c)}")
    ax.set_title("Player Clusters: PPG vs Shot Efficiency")
    ax.set_xlabel("Points Per Game")
    ax.set_ylabel("Shot Efficiency")
    ax.legend(fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "clustering_analysis.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print("\nSaved: clustering_analysis.png")


def main():
    db_path = get_db_path()
    print(f"Using database: {db_path}")
    
    df = load_data(db_path)
    print(f"Loaded {len(df):,} players with game data")
    
    descriptive_stats(df)
    regression_analysis(df)
    clustering_analysis(df)
    
    print("\n" + "="*60)
    print(f"All outputs saved to: {OUTPUT_DIR}")
    print("="*60)


if __name__ == "__main__":
    main()
