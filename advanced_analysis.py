"""
FullCourtVision — Advanced Analysis (Phase 2)
- Random Forest vs Linear Regression comparison
- Player development tracking across seasons
- Age group percentile rankings
- Feature importance analysis

Outputs saved to analysis_output/
"""

import os
import re
import sqlite3
import json
import warnings

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from scipy import stats as scipy_stats

warnings.filterwarnings("ignore")

# --- Config ---
DB_PATHS = [
    r"C:\Users\ben\.openclaw\workspace\playhq.db",
    r"C:\Projects\FullCourtVision\data\playhq.db",
]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analysis_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Season ordering for temporal analysis
SEASON_ORDER = {
    "Summer 2020/21": 0, "Winter 2021": 1,
    "Summer 2021/22": 2, "Winter 2022": 3,
    "Summer 2022/23": 4, "Winter 2023": 5,
    "Summer 2023/24": 6, "Winter 2024": 7,
    "Summer 2024/25": 8, "Winter 2025": 9,
    "Summer 2025/26": 10,
}

def get_db_path():
    for p in DB_PATHS:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"playhq.db not found in: {DB_PATHS}")


def extract_age_group(grade_name):
    """Extract age group (e.g., 'U14') from grade name like 'Boys U14 BF'."""
    m = re.search(r'U(\d+)', grade_name)
    return f"U{m.group(1)}" if m else None


def extract_gender(grade_name):
    """Extract gender from grade name."""
    if grade_name.startswith("Boys"):
        return "Boys"
    elif grade_name.startswith("Girls"):
        return "Girls"
    return "Unknown"


def load_detailed_data(db_path):
    """Load per-grade player stats with season and grade info."""
    conn = sqlite3.connect(db_path)
    query = """
    SELECT
        p.id as player_id,
        p.first_name || ' ' || p.last_name as player_name,
        ps.grade_id,
        g.name as grade_name,
        s.name as season_name,
        ps.games_played,
        ps.total_points,
        ps.one_point as free_throws,
        ps.two_point as two_pt_made,
        ps.three_point as three_pt_made,
        ps.total_fouls,
        ps.team_name
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN grades g ON g.id = ps.grade_id
    JOIN seasons s ON s.id = g.season_id
    WHERE ps.games_played > 0
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    df["ppg"] = df["total_points"] / df["games_played"]
    df["fpg"] = df["total_fouls"] / df["games_played"]
    df["age_group"] = df["grade_name"].apply(extract_age_group)
    df["gender"] = df["grade_name"].apply(extract_gender)
    df["season_order"] = df["season_name"].map(SEASON_ORDER)
    
    return df


def load_aggregated_data(db_path):
    """Load aggregated player data (same as original analysis.py)."""
    conn = sqlite3.connect(db_path)
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
    
    df["ppg"] = df["total_points"] / df["games_played"]
    df["fpg"] = df["total_fouls"] / df["games_played"]
    total_makes = df["free_throws_made"] + df["two_pt_made"] + df["three_pt_made"]
    df["shot_efficiency"] = np.where(total_makes > 0, df["total_points"] / total_makes, 0)
    df["pct_from_3pt"] = np.where(
        df["total_points"] > 0,
        (df["three_pt_made"] * 3) / df["total_points"] * 100, 0
    )
    return df


# =============================================================================
# 1. RANDOM FOREST vs LINEAR REGRESSION
# =============================================================================
def random_forest_comparison(df):
    """Compare Random Forest to Linear Regression for predicting PPG."""
    print("\n" + "=" * 70)
    print("RANDOM FOREST vs LINEAR REGRESSION — Predicting PPG")
    print("=" * 70)

    # Filter to players with meaningful sample
    reg_df = df[df["games_played"] >= 5].copy()
    
    features = ["games_played", "two_pt_made", "three_pt_made", "free_throws_made",
                "total_fouls", "seasons_played"]
    target = "ppg"

    X = reg_df[features].values
    y = reg_df[target].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    lr_r2 = r2_score(y_test, lr_pred)
    lr_mae = mean_absolute_error(y_test, lr_pred)

    # Random Forest
    rf = RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_leaf=5,
                                random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_r2 = r2_score(y_test, rf_pred)
    rf_mae = mean_absolute_error(y_test, rf_pred)

    # Cross-validation
    lr_cv = cross_val_score(LinearRegression(), X, y, cv=5, scoring="r2")
    rf_cv = cross_val_score(RandomForestRegressor(n_estimators=200, max_depth=15,
                            min_samples_leaf=5, random_state=42, n_jobs=-1),
                            X, y, cv=5, scoring="r2")

    print(f"\nDataset: {len(reg_df):,} players (5+ games)")
    print(f"\n{'Model':<25} {'Test R²':>10} {'Test MAE':>10} {'CV R² (mean±std)':>22}")
    print("-" * 70)
    print(f"{'Linear Regression':<25} {lr_r2:>10.4f} {lr_mae:>10.4f} {lr_cv.mean():>10.4f} ± {lr_cv.std():.4f}")
    print(f"{'Random Forest':<25} {rf_r2:>10.4f} {rf_mae:>10.4f} {rf_cv.mean():>10.4f} ± {rf_cv.std():.4f}")

    # Feature importance
    importances = pd.Series(rf.feature_importances_, index=features).sort_values(ascending=False)
    print(f"\nRandom Forest Feature Importance:")
    for feat, imp in importances.items():
        print(f"  {feat:<25} {imp:.4f} {'#' * int(imp * 50)}")

    # Save results
    results = {
        "n_players": len(reg_df),
        "linear_regression": {"test_r2": round(lr_r2, 4), "test_mae": round(lr_mae, 4),
                              "cv_r2_mean": round(lr_cv.mean(), 4), "cv_r2_std": round(lr_cv.std(), 4)},
        "random_forest": {"test_r2": round(rf_r2, 4), "test_mae": round(rf_mae, 4),
                          "cv_r2_mean": round(rf_cv.mean(), 4), "cv_r2_std": round(rf_cv.std(), 4)},
        "feature_importance": {k: round(v, 4) for k, v in importances.items()}
    }
    with open(os.path.join(OUTPUT_DIR, "model_comparison.json"), "w") as f:
        json.dump(results, f, indent=2)

    # Charts
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))
    fig.suptitle("Random Forest vs Linear Regression — PPG Prediction", fontsize=14, fontweight="bold")

    # Actual vs Predicted — LR
    ax = axes[0, 0]
    ax.scatter(y_test, lr_pred, alpha=0.3, s=10, color="#2196F3")
    mx = max(y_test.max(), lr_pred.max())
    ax.plot([0, mx], [0, mx], "r--", lw=1)
    ax.set_title(f"Linear Regression (R²={lr_r2:.3f})")
    ax.set_xlabel("Actual PPG"); ax.set_ylabel("Predicted PPG")

    # Actual vs Predicted — RF
    ax = axes[0, 1]
    ax.scatter(y_test, rf_pred, alpha=0.3, s=10, color="#4CAF50")
    ax.plot([0, mx], [0, mx], "r--", lw=1)
    ax.set_title(f"Random Forest (R²={rf_r2:.3f})")
    ax.set_xlabel("Actual PPG"); ax.set_ylabel("Predicted PPG")

    # Feature importance
    ax = axes[1, 0]
    importances.plot(kind="barh", ax=ax, color="#FF9800")
    ax.set_title("Feature Importance (Random Forest)")
    ax.set_xlabel("Importance")

    # Residual comparison
    ax = axes[1, 1]
    ax.hist(y_test - lr_pred, bins=50, alpha=0.6, color="#2196F3", label=f"LR (MAE={lr_mae:.2f})")
    ax.hist(y_test - rf_pred, bins=50, alpha=0.6, color="#4CAF50", label=f"RF (MAE={rf_mae:.2f})")
    ax.set_title("Residual Distributions")
    ax.set_xlabel("Residual (Actual - Predicted)"); ax.set_ylabel("Count")
    ax.legend()

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "model_comparison.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print("\nSaved: model_comparison.png, model_comparison.json")
    
    return results


# =============================================================================
# 2. PLAYER DEVELOPMENT TRACKING
# =============================================================================
def player_development_tracking(df_detailed):
    """Track how players develop across seasons."""
    print("\n" + "=" * 70)
    print("PLAYER DEVELOPMENT TRACKING — Cross-Season Analysis")
    print("=" * 70)

    # Aggregate per player per season (combine grading + regular season within same season)
    season_agg = df_detailed.groupby(["player_id", "player_name", "season_name", "age_group", "gender"]).agg({
        "games_played": "sum",
        "total_points": "sum",
        "free_throws": "sum",
        "two_pt_made": "sum",
        "three_pt_made": "sum",
        "total_fouls": "sum",
        "season_order": "first"
    }).reset_index()

    season_agg["ppg"] = season_agg["total_points"] / season_agg["games_played"]
    season_agg["fpg"] = season_agg["total_fouls"] / season_agg["games_played"]

    # Find players with 3+ seasons
    player_seasons = season_agg.groupby("player_id")["season_name"].nunique()
    multi_season = player_seasons[player_seasons >= 3].index
    print(f"\nPlayers with 3+ seasons: {len(multi_season):,}")

    multi_df = season_agg[season_agg["player_id"].isin(multi_season)].sort_values(["player_id", "season_order"])

    # Calculate PPG change per player across seasons
    developments = []
    for pid, group in multi_df.groupby("player_id"):
        group = group.sort_values("season_order")
        if len(group) < 2:
            continue
        first_ppg = group.iloc[0]["ppg"]
        last_ppg = group.iloc[-1]["ppg"]
        ppg_change = last_ppg - first_ppg
        n_seasons = len(group)
        developments.append({
            "player_id": pid,
            "player_name": group.iloc[0]["player_name"],
            "first_season": group.iloc[0]["season_name"],
            "last_season": group.iloc[-1]["season_name"],
            "first_ppg": round(first_ppg, 2),
            "last_ppg": round(last_ppg, 2),
            "ppg_change": round(ppg_change, 2),
            "ppg_change_pct": round((ppg_change / first_ppg * 100) if first_ppg > 0 else 0, 1),
            "n_seasons": n_seasons,
            "total_games": int(group["games_played"].sum())
        })

    dev_df = pd.DataFrame(developments)
    dev_df = dev_df[dev_df["total_games"] >= 10]  # meaningful sample

    print(f"Players with 10+ career games across 3+ seasons: {len(dev_df):,}")
    print(f"\nPPG Change Distribution:")
    print(f"  Mean change: {dev_df['ppg_change'].mean():+.2f}")
    print(f"  Median change: {dev_df['ppg_change'].median():+.2f}")
    print(f"  Improved (PPG up): {(dev_df['ppg_change'] > 0).sum()} ({(dev_df['ppg_change'] > 0).mean()*100:.1f}%)")
    print(f"  Declined (PPG down): {(dev_df['ppg_change'] < 0).sum()} ({(dev_df['ppg_change'] < 0).mean()*100:.1f}%)")

    # Top improvers
    top_improvers = dev_df.nlargest(15, "ppg_change")
    print(f"\nTop 15 Improvers (PPG gain):")
    for _, row in top_improvers.iterrows():
        print(f"  {row['player_name']:<30} {row['first_ppg']:>5.1f} -> {row['last_ppg']:>5.1f}  ({row['ppg_change']:+.1f})  [{row['n_seasons']} seasons, {row['total_games']} games]")

    # Save
    dev_df.to_csv(os.path.join(OUTPUT_DIR, "player_development.csv"), index=False)

    # Chart
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Player Development Across Seasons", fontsize=14, fontweight="bold")

    # PPG change distribution
    ax = axes[0]
    ax.hist(dev_df["ppg_change"], bins=60, color="#2196F3", edgecolor="white", alpha=0.8)
    ax.axvline(0, color="red", linestyle="--", lw=1)
    ax.axvline(dev_df["ppg_change"].mean(), color="orange", linestyle="-", lw=2,
               label=f"Mean: {dev_df['ppg_change'].mean():+.2f}")
    ax.set_title("PPG Change Distribution (First → Last Season)")
    ax.set_xlabel("PPG Change"); ax.set_ylabel("Players"); ax.legend()

    # PPG change vs number of seasons
    ax = axes[1]
    ax.scatter(dev_df["n_seasons"], dev_df["ppg_change"], alpha=0.3, s=10, color="#9C27B0")
    ax.axhline(0, color="red", linestyle="--", lw=1)
    ax.set_title("PPG Change vs Career Length")
    ax.set_xlabel("Number of Seasons"); ax.set_ylabel("PPG Change")

    # First PPG vs Last PPG
    ax = axes[2]
    ax.scatter(dev_df["first_ppg"], dev_df["last_ppg"], alpha=0.3, s=10, color="#4CAF50")
    mx = max(dev_df["first_ppg"].max(), dev_df["last_ppg"].max())
    ax.plot([0, mx], [0, mx], "r--", lw=1, label="No change")
    ax.set_title("First Season PPG vs Last Season PPG")
    ax.set_xlabel("First Season PPG"); ax.set_ylabel("Last Season PPG"); ax.legend()

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "player_development.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print("\nSaved: player_development.png, player_development.csv")

    return dev_df


# =============================================================================
# 3. AGE GROUP PERCENTILE RANKINGS
# =============================================================================
def age_group_percentiles(df_detailed):
    """Calculate percentile rankings within each age group."""
    print("\n" + "=" * 70)
    print("AGE GROUP PERCENTILE RANKINGS")
    print("=" * 70)

    # Aggregate per player per age group (across all seasons at that age group)
    age_agg = df_detailed.groupby(["player_id", "player_name", "age_group", "gender"]).agg({
        "games_played": "sum",
        "total_points": "sum",
        "free_throws": "sum",
        "two_pt_made": "sum",
        "three_pt_made": "sum",
        "total_fouls": "sum",
    }).reset_index()

    age_agg["ppg"] = age_agg["total_points"] / age_agg["games_played"]
    age_agg["fpg"] = age_agg["total_fouls"] / age_agg["games_played"]

    # Filter to 3+ games for meaningful percentiles
    age_agg = age_agg[age_agg["games_played"] >= 3]

    # Calculate percentiles within each age group + gender
    benchmarks = []
    percentiles = [10, 25, 50, 75, 90, 95, 99]

    print(f"\n{'Age Group':<12} {'Gender':<8} {'N':>6} {'Median PPG':>11} {'75th':>6} {'90th':>6} {'95th':>6} {'99th':>6}")
    print("-" * 70)

    for (ag, gender), group in age_agg.groupby(["age_group", "gender"]):
        if ag is None or len(group) < 20:
            continue
        pcts = {f"p{p}": round(np.percentile(group["ppg"], p), 2) for p in percentiles}
        pcts_fpg = {f"fpg_p{p}": round(np.percentile(group["fpg"], p), 2) for p in percentiles}
        
        row = {"age_group": ag, "gender": gender, "n_players": len(group),
               "mean_ppg": round(group["ppg"].mean(), 2), "std_ppg": round(group["ppg"].std(), 2),
               "mean_fpg": round(group["fpg"].mean(), 2), **pcts, **pcts_fpg}
        benchmarks.append(row)

        print(f"{ag:<12} {gender:<8} {len(group):>6} {pcts['p50']:>11.2f} {pcts['p75']:>6.2f} {pcts['p90']:>6.2f} {pcts['p95']:>6.2f} {pcts['p99']:>6.2f}")

    # Add percentile rank to each player
    age_agg["ppg_percentile"] = age_agg.groupby(["age_group", "gender"])["ppg"].rank(pct=True).round(4) * 100
    age_agg["fpg_percentile"] = age_agg.groupby(["age_group", "gender"])["fpg"].rank(pct=True).round(4) * 100

    bench_df = pd.DataFrame(benchmarks)
    bench_df.to_csv(os.path.join(OUTPUT_DIR, "age_group_benchmarks.csv"), index=False)
    age_agg.to_csv(os.path.join(OUTPUT_DIR, "player_percentiles.csv"), index=False)

    # Chart: PPG distribution by age group (Boys only for clarity)
    boys = age_agg[(age_agg["gender"] == "Boys") & (age_agg["age_group"].notna())]
    age_order = sorted(boys["age_group"].unique(), key=lambda x: int(x[1:]))

    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.suptitle("Age Group Benchmarks — PPG Distributions", fontsize=14, fontweight="bold")

    # Box plot
    ax = axes[0]
    box_data = [boys[boys["age_group"] == ag]["ppg"].values for ag in age_order]
    bp = ax.boxplot(box_data, labels=age_order, patch_artist=True, showfliers=False)
    colors = plt.cm.viridis(np.linspace(0.2, 0.9, len(age_order)))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
    ax.set_title("PPG by Age Group (Boys, 3+ games)")
    ax.set_xlabel("Age Group"); ax.set_ylabel("Points Per Game")

    # Median PPG trend
    ax = axes[1]
    boys_bench = bench_df[bench_df["gender"] == "Boys"].copy()
    boys_bench["age_num"] = boys_bench["age_group"].str.extract(r'U(\d+)').astype(int)
    boys_bench = boys_bench.sort_values("age_num")
    ax.plot(boys_bench["age_group"], boys_bench["p50"], "o-", color="#2196F3", lw=2, label="50th (median)")
    ax.plot(boys_bench["age_group"], boys_bench["p75"], "s--", color="#FF9800", lw=1.5, label="75th")
    ax.plot(boys_bench["age_group"], boys_bench["p90"], "^--", color="#F44336", lw=1.5, label="90th")
    ax.plot(boys_bench["age_group"], boys_bench["p95"], "d--", color="#9C27B0", lw=1.5, label="95th")
    ax.fill_between(boys_bench["age_group"], boys_bench["p25"], boys_bench["p75"], alpha=0.2, color="#2196F3")
    ax.set_title("PPG Percentiles by Age Group (Boys)")
    ax.set_xlabel("Age Group"); ax.set_ylabel("Points Per Game"); ax.legend()
    ax.tick_params(axis='x', rotation=45)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "age_group_benchmarks.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"\nSaved: age_group_benchmarks.png, age_group_benchmarks.csv, player_percentiles.csv")

    return age_agg, bench_df


# =============================================================================
# 4. JOSHUA DWORKIN ANALYSIS (Preview)
# =============================================================================
def joshua_analysis(df_detailed, age_agg):
    """Quick analysis of Joshua Dworkin's stats and percentile rankings."""
    print("\n" + "=" * 70)
    print("JOSHUA DWORKIN — Career Analysis Preview")
    print("=" * 70)

    josh = df_detailed[df_detailed["player_name"] == "Joshua Dworkin"].copy()
    if josh.empty:
        print("Joshua Dworkin not found in dataset.")
        return

    # Aggregate per season
    josh_seasons = josh.groupby(["season_name", "age_group"]).agg({
        "games_played": "sum",
        "total_points": "sum",
        "free_throws": "sum",
        "two_pt_made": "sum",
        "three_pt_made": "sum",
        "total_fouls": "sum",
        "season_order": "first"
    }).reset_index().sort_values("season_order")

    josh_seasons["ppg"] = josh_seasons["total_points"] / josh_seasons["games_played"]
    josh_seasons["fpg"] = josh_seasons["total_fouls"] / josh_seasons["games_played"]

    print(f"\n{'Season':<20} {'Age Grp':<8} {'GP':>4} {'PTS':>5} {'PPG':>6} {'FPG':>6} {'FT':>4} {'2PT':>4} {'3PT':>4}")
    print("-" * 70)
    for _, row in josh_seasons.iterrows():
        print(f"{row['season_name']:<20} {row['age_group']:<8} {int(row['games_played']):>4} {int(row['total_points']):>5} {row['ppg']:>6.1f} {row['fpg']:>6.1f} {int(row['free_throws']):>4} {int(row['two_pt_made']):>4} {int(row['three_pt_made']):>4}")

    # Percentile rankings from age_agg
    josh_pcts = age_agg[age_agg["player_name"] == "Joshua Dworkin"]
    if not josh_pcts.empty:
        print(f"\nPercentile Rankings:")
        for _, row in josh_pcts.iterrows():
            print(f"  {row['age_group']} ({row['gender']}): PPG={row['ppg']:.1f} -> {row['ppg_percentile']:.0f}th percentile")

    # Save
    josh_seasons.to_csv(os.path.join(OUTPUT_DIR, "joshua_dworkin_career.csv"), index=False)
    print(f"\nSaved: joshua_dworkin_career.csv")


# =============================================================================
# MAIN
# =============================================================================
def main():
    db_path = get_db_path()
    print(f"Using database: {db_path}")

    # Load data
    df_agg = load_aggregated_data(db_path)
    df_detailed = load_detailed_data(db_path)
    print(f"Loaded {len(df_agg):,} players (aggregated), {len(df_detailed):,} stat lines (detailed)")

    # Run analyses
    model_results = random_forest_comparison(df_agg)
    dev_df = player_development_tracking(df_detailed)
    age_agg, benchmarks = age_group_percentiles(df_detailed)
    joshua_analysis(df_detailed, age_agg)

    # Summary
    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE — Summary")
    print("=" * 70)
    print(f"\nModel Comparison:")
    print(f"  Linear Regression R²: {model_results['linear_regression']['test_r2']:.4f}")
    print(f"  Random Forest R²:     {model_results['random_forest']['test_r2']:.4f}")
    rf_better = model_results['random_forest']['test_r2'] > model_results['linear_regression']['test_r2']
    print(f"  Winner: {'Random Forest' if rf_better else 'Linear Regression'}")
    print(f"\nPlayer Development: {len(dev_df):,} multi-season players tracked")
    print(f"Age Group Benchmarks: {len(benchmarks):,} age-gender groups analysed")
    print(f"\nAll outputs in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
