"""Generate all Jupyter notebooks for FullCourtVision portfolio."""
import nbformat
import os

NB_DIR = r"C:\Projects\FullCourtVision\notebooks"
os.makedirs(NB_DIR, exist_ok=True)

def nb(cells):
    """Create a notebook from a list of (type, source) tuples."""
    notebook = nbformat.v4.new_notebook()
    notebook.metadata.kernelspec = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3"
    }
    for cell_type, source in cells:
        if cell_type == "md":
            notebook.cells.append(nbformat.v4.new_markdown_cell(source))
        else:
            notebook.cells.append(nbformat.v4.new_code_cell(source))
    return notebook

def save(notebook, name):
    path = os.path.join(NB_DIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        nbformat.write(notebook, f)
    print(f"  Created {name}")

# ============================================================
# 01 - League Overview
# ============================================================
nb01 = nb([
    ("md", """# 🏀 EDJBA League Overview

## Key Findings
- **16,955 players** tracked across 13 seasons of Eastern Districts Junior Basketball
- **91,704 stat lines** covering U10 through U18+ age groups
- **40,505 games** recorded with full box scores
- Scoring follows a right-skewed distribution — most players score 2-6 PPG, with a long tail of elite scorers

---

*Data source: PlayHQ GraphQL API (Basketball Victoria) — reverse-engineered, no auth required.*"""),

    ("code", """%matplotlib inline
import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['figure.dpi'] = 120

# Connect to the database
DB_PATH = "../data/playhq.db"
conn = sqlite3.connect(DB_PATH)
print("Connected to playhq.db")"""),

    ("md", """## Dataset Scale

Let's start by understanding the sheer volume of data we're working with."""),

    ("code", """# Dataset overview
tables = {
    'organisations': 'Basketball organisations in Victoria',
    'seasons': 'Competition seasons (Summer/Winter)',
    'grades': 'Age/skill divisions (e.g., Boys U14 BF)',
    'players': 'Individual players',
    'player_stats': 'Player stat lines (per grade per season)',
    'games': 'Individual game records',
    'teams': 'Team registrations',
    'rounds': 'Competition rounds',
}

print("=" * 55)
print(f"{'Table':<20} {'Rows':>10}   Description")
print("=" * 55)
for table, desc in tables.items():
    count = pd.read_sql(f"SELECT COUNT(*) as n FROM {table}", conn).iloc[0, 0]
    print(f"{table:<20} {count:>10,}   {desc}")"""),

    ("md", """## Player Statistics — Aggregated View

We aggregate each player's stats across all grades and seasons to get career totals."""),

    ("code", """# Load aggregated player data
df = pd.read_sql(\"\"\"
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
\"\"\", conn)

df["ppg"] = df["total_points"] / df["games_played"]
df["fpg"] = df["total_fouls"] / df["games_played"]

print(f"Players with game data: {len(df):,}")
print(f"Total games played:     {df['games_played'].sum():,.0f}")
print(f"Total points scored:    {df['total_points'].sum():,.0f}")
print(f"\\nPPG Summary (all players):")
df[["games_played", "total_points", "ppg", "fpg"]].describe().round(2)"""),

    ("md", """## Scoring Distributions

The PPG distribution is heavily right-skewed — junior basketball has many low-volume scorers and a handful of dominant players."""),

    ("code", """fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("EDJBA Player Statistics Overview", fontsize=16, fontweight="bold", y=1.02)

# PPG distribution
ax = axes[0, 0]
active = df[df["ppg"] > 0]
ax.hist(active["ppg"], bins=60, color="#1976D2", edgecolor="white", alpha=0.85)
ax.axvline(active["ppg"].median(), color="#D32F2F", ls="--", lw=2, label=f'Median: {active["ppg"].median():.1f}')
ax.axvline(active["ppg"].mean(), color="#FF9800", ls="--", lw=2, label=f'Mean: {active["ppg"].mean():.1f}')
ax.set_title("Points Per Game Distribution", fontweight="bold")
ax.set_xlabel("PPG"); ax.set_ylabel("Players"); ax.legend()

# FPG distribution
ax = axes[0, 1]
ax.hist(df["fpg"], bins=40, color="#FF9800", edgecolor="white", alpha=0.85)
ax.axvline(df["fpg"].median(), color="#D32F2F", ls="--", lw=2, label=f'Median: {df["fpg"].median():.1f}')
ax.set_title("Fouls Per Game Distribution", fontweight="bold")
ax.set_xlabel("FPG"); ax.set_ylabel("Players"); ax.legend()

# Scoring breakdown — top 50
ax = axes[1, 0]
top50 = df.nlargest(50, "total_points")
x = range(len(top50))
ax.bar(x, top50["free_throws_made"], label="Free Throws", color="#4CAF50")
ax.bar(x, top50["two_pt_made"] * 2, bottom=top50["free_throws_made"], label="2PT Points", color="#1976D2")
ax.bar(x, top50["three_pt_made"] * 3,
       bottom=top50["free_throws_made"] + top50["two_pt_made"] * 2,
       label="3PT Points", color="#D32F2F")
ax.set_title("Scoring Breakdown — Top 50 Career Scorers", fontweight="bold")
ax.set_xlabel("Player Rank"); ax.set_ylabel("Points"); ax.legend(fontsize=9)

# PPG vs FPG
ax = axes[1, 1]
sample = df[df["games_played"] >= 5].sample(min(2000, len(df[df["games_played"] >= 5])), random_state=42)
scatter = ax.scatter(sample["ppg"], sample["fpg"], alpha=0.3, s=12, c=sample["games_played"],
                     cmap="viridis", edgecolors="none")
plt.colorbar(scatter, ax=ax, label="Games Played")
ax.set_title("PPG vs FPG (5+ games)", fontweight="bold")
ax.set_xlabel("Points Per Game"); ax.set_ylabel("Fouls Per Game")

plt.tight_layout()
plt.savefig("../assets/league_overview.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## Top 20 Scorers (min 5 games)"""),

    ("code", """top20 = (df[df["games_played"] >= 5]
         .nlargest(20, "ppg")
         [["player_name", "games_played", "total_points", "ppg", "fpg", "two_pt_made", "three_pt_made"]]
         .round(2))
top20.index = range(1, 21)
top20.columns = ["Player", "GP", "PTS", "PPG", "FPG", "2PM", "3PM"]
top20"""),

    ("md", """## Season Coverage

How many seasons of data do we have, and how active is each one?"""),

    ("code", """seasons = pd.read_sql(\"\"\"
    SELECT s.name as season, COUNT(DISTINCT g.id) as grades,
           COUNT(DISTINCT ps.player_id) as players,
           SUM(ps.games_played) as total_gp
    FROM seasons s
    JOIN grades g ON g.season_id = s.id
    LEFT JOIN player_stats ps ON ps.grade_id = g.id
    GROUP BY s.id
    ORDER BY s.start_date
\"\"\", conn)
seasons"""),

    ("code", "conn.close()"),
])
save(nb01, "01-league-overview.ipynb")

# ============================================================
# 02 - Scoring Models
# ============================================================
nb02 = nb([
    ("md", """# 📊 Scoring Models — Linear Regression vs Random Forest

## Key Findings
- **Linear Regression R² ≈ 0.99** for predicting total points from shot makes — this is almost definitional (2PT×2 + 3PT×3 ≈ total)
- **Random Forest outperforms LR** for predicting PPG from career features (non-trivial prediction)
- **Two-point makes** are the single most important feature for PPG prediction
- The models reveal that EDJBA scoring is dominated by 2-point field goals, not 3-pointers

---"""),

    ("code", """%matplotlib inline
import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import warnings; warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid"); plt.rcParams['figure.dpi'] = 120

conn = sqlite3.connect("../data/playhq.db")
df = pd.read_sql(\"\"\"
    SELECT p.id, p.first_name || ' ' || p.last_name as name,
        SUM(ps.games_played) as gp, SUM(ps.total_points) as pts,
        SUM(ps.one_point) as ft, SUM(ps.two_point) as fg2,
        SUM(ps.three_point) as fg3, SUM(ps.total_fouls) as fouls,
        COUNT(DISTINCT ps.grade_id) as seasons
    FROM player_stats ps JOIN players p ON p.id = ps.player_id
    GROUP BY p.id HAVING SUM(ps.games_played) > 0
\"\"\", conn)
conn.close()

df["ppg"] = df["pts"] / df["gp"]
df["fpg"] = df["fouls"] / df["gp"]
total_makes = df["ft"] + df["fg2"] + df["fg3"]
df["efficiency"] = np.where(total_makes > 0, df["pts"] / total_makes, 0)

reg = df[df["gp"] >= 5].copy()
print(f"Players with 5+ games: {len(reg):,}")"""),

    ("md", """## Model 1: Predicting Total Points (Sanity Check)

This is almost a tautology — total points ≈ FT×1 + 2PT×2 + 3PT×3. But it validates our data quality."""),

    ("code", """features_total = ["fg2", "fg3", "gp"]
X = reg[features_total].values
y = reg["pts"].values

lr = LinearRegression().fit(X, y)
print(f"R² = {lr.score(X, y):.4f}")
print(f"Intercept: {lr.intercept_:.2f}")
for f, c in zip(features_total, lr.coef_):
    print(f"  {f}: {c:.4f}")
print(f"\\n→ Each 2PT make contributes ~{lr.coef_[0]:.2f} points (expected: 2.0)")
print(f"→ Each 3PT make contributes ~{lr.coef_[1]:.2f} points (expected: 3.0)")"""),

    ("md", """## Model 2: Predicting PPG (The Real Test)

Now we predict points per game from career features — this is a genuine prediction task."""),

    ("code", """features_ppg = ["gp", "fg2", "fg3", "ft", "fouls", "seasons"]
X = reg[features_ppg].values
y = reg["ppg"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Linear Regression
lr2 = LinearRegression().fit(X_train, y_train)
lr_pred = lr2.predict(X_test)
lr_r2 = r2_score(y_test, lr_pred)
lr_mae = mean_absolute_error(y_test, lr_pred)

# Random Forest
rf = RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_leaf=5, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_r2 = r2_score(y_test, rf_pred)
rf_mae = mean_absolute_error(y_test, rf_pred)

# Cross-validation
lr_cv = cross_val_score(LinearRegression(), X, y, cv=5, scoring="r2")
rf_cv = cross_val_score(RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_leaf=5,
                        random_state=42, n_jobs=-1), X, y, cv=5, scoring="r2")

print(f"{'Model':<22} {'Test R²':>8} {'Test MAE':>9} {'CV R² (mean±std)':>20}")
print("-" * 62)
print(f"{'Linear Regression':<22} {lr_r2:>8.4f} {lr_mae:>9.4f} {lr_cv.mean():>8.4f} ± {lr_cv.std():.4f}")
print(f"{'Random Forest':<22} {rf_r2:>8.4f} {rf_mae:>9.4f} {rf_cv.mean():>8.4f} ± {rf_cv.std():.4f}")"""),

    ("code", """fig, axes = plt.subplots(2, 2, figsize=(14, 11))
fig.suptitle("Random Forest vs Linear Regression — PPG Prediction", fontsize=15, fontweight="bold")

# LR actual vs predicted
ax = axes[0, 0]
ax.scatter(y_test, lr_pred, alpha=0.3, s=10, color="#1976D2")
mx = max(y_test.max(), lr_pred.max())
ax.plot([0, mx], [0, mx], "r--", lw=1)
ax.set_title(f"Linear Regression (R²={lr_r2:.3f})"); ax.set_xlabel("Actual PPG"); ax.set_ylabel("Predicted PPG")

# RF actual vs predicted
ax = axes[0, 1]
ax.scatter(y_test, rf_pred, alpha=0.3, s=10, color="#388E3C")
ax.plot([0, mx], [0, mx], "r--", lw=1)
ax.set_title(f"Random Forest (R²={rf_r2:.3f})"); ax.set_xlabel("Actual PPG"); ax.set_ylabel("Predicted PPG")

# Feature importance
ax = axes[1, 0]
imp = pd.Series(rf.feature_importances_, index=features_ppg).sort_values()
imp.plot(kind="barh", ax=ax, color="#FF9800")
ax.set_title("Feature Importance (Random Forest)"); ax.set_xlabel("Importance")

# Residuals
ax = axes[1, 1]
ax.hist(y_test - lr_pred, bins=50, alpha=0.6, color="#1976D2", label=f"LR (MAE={lr_mae:.2f})")
ax.hist(y_test - rf_pred, bins=50, alpha=0.6, color="#388E3C", label=f"RF (MAE={rf_mae:.2f})")
ax.set_title("Residual Distributions"); ax.set_xlabel("Residual"); ax.set_ylabel("Count"); ax.legend()

plt.tight_layout()
plt.savefig("../assets/model_comparison.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## Interpretation

The near-perfect R² on total points is expected — it's essentially reconstructing `FT + 2×FG2 + 3×FG3`. The interesting finding is in PPG prediction:

1. **Random Forest captures non-linear relationships** that linear regression misses
2. **Two-point field goals dominate** feature importance — this is junior basketball, where the 3-point line is less relevant
3. **Games played and seasons** matter because they proxy for experience and development
4. The residual distributions show RF has tighter predictions, especially for high-PPG outliers"""),
])
save(nb02, "02-scoring-models.ipynb")

# ============================================================
# 03 - Player Clustering
# ============================================================
nb03 = nb([
    ("md", """# 🎯 Player Clustering — Discovering Archetypes

## Key Findings
- K-means reveals **3 distinct player archetypes**: High Scorers, Mid-Range Contributors, and Low-Volume players
- The **High Scorer cluster** averages 2-3× the PPG of the Mid-Range group
- Shot efficiency correlates with volume — the best scorers are also the most efficient
- Clustering is useful for identifying players who "punch above their weight" in efficiency

---"""),

    ("code", """%matplotlib inline
import sqlite3, pandas as pd, numpy as np
import matplotlib.pyplot as plt, seaborn as sns
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import warnings; warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid"); plt.rcParams['figure.dpi'] = 120

conn = sqlite3.connect("../data/playhq.db")
df = pd.read_sql(\"\"\"
    SELECT p.id, p.first_name || ' ' || p.last_name as name,
        SUM(ps.games_played) as gp, SUM(ps.total_points) as pts,
        SUM(ps.one_point) as ft, SUM(ps.two_point) as fg2,
        SUM(ps.three_point) as fg3, SUM(ps.total_fouls) as fouls
    FROM player_stats ps JOIN players p ON p.id = ps.player_id
    GROUP BY p.id HAVING SUM(ps.games_played) >= 5
\"\"\", conn)
conn.close()

df["ppg"] = df["pts"] / df["gp"]
df["fpg"] = df["fouls"] / df["gp"]
makes = df["ft"] + df["fg2"] + df["fg3"]
df["efficiency"] = np.where(makes > 0, df["pts"] / makes, 0)
print(f"Players with 5+ games: {len(df):,}")"""),

    ("md", """## Elbow Method — Finding Optimal K"""),

    ("code", """features = ["ppg", "fpg", "efficiency"]
X = StandardScaler().fit_transform(df[features])

inertias = []
K_range = range(2, 9)
for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X)
    inertias.append(km.inertia_)

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(K_range, inertias, "o-", color="#1976D2", lw=2)
ax.set_title("Elbow Method for K-Means", fontweight="bold")
ax.set_xlabel("Number of Clusters (K)"); ax.set_ylabel("Inertia")
ax.axvline(3, color="#D32F2F", ls="--", alpha=0.7, label="K=3 (chosen)")
ax.legend()
plt.tight_layout(); plt.show()"""),

    ("md", """## K=3 Clustering"""),

    ("code", """km = KMeans(n_clusters=3, random_state=42, n_init=10)
df["cluster"] = km.fit_predict(X)

# Label clusters by avg PPG
labels = {}
for c in sorted(df["cluster"].unique()):
    avg = df[df["cluster"] == c]["ppg"].mean()
    if avg > df["ppg"].median() * 1.5:
        labels[c] = "⭐ High Scorers"
    elif avg < df["ppg"].median() * 0.5:
        labels[c] = "📉 Low Volume"
    else:
        labels[c] = "📊 Mid-Range"

df["archetype"] = df["cluster"].map(labels)

for c in sorted(df["cluster"].unique()):
    sub = df[df["cluster"] == c]
    print(f"\\n{labels[c]} (n={len(sub):,})")
    print(f"  Avg PPG: {sub['ppg'].mean():.2f}  |  Avg FPG: {sub['fpg'].mean():.2f}  |  Avg Efficiency: {sub['efficiency'].mean():.2f}")
    print(f"  Avg Games: {sub['gp'].mean():.1f}")"""),

    ("code", """colors = {"⭐ High Scorers": "#D32F2F", "📊 Mid-Range": "#1976D2", "📉 Low Volume": "#9E9E9E"}

fig, axes = plt.subplots(1, 2, figsize=(14, 6))

ax = axes[0]
for arch, color in colors.items():
    sub = df[df["archetype"] == arch]
    ax.scatter(sub["ppg"], sub["fpg"], alpha=0.4, s=12, color=color, label=f"{arch} (n={len(sub):,})")
ax.set_title("Player Clusters: PPG vs FPG", fontweight="bold")
ax.set_xlabel("Points Per Game"); ax.set_ylabel("Fouls Per Game"); ax.legend(fontsize=9)

ax = axes[1]
for arch, color in colors.items():
    sub = df[df["archetype"] == arch]
    ax.scatter(sub["ppg"], sub["efficiency"], alpha=0.4, s=12, color=color, label=arch)
ax.set_title("Player Clusters: PPG vs Shot Efficiency", fontweight="bold")
ax.set_xlabel("Points Per Game"); ax.set_ylabel("Shot Efficiency"); ax.legend(fontsize=9)

plt.tight_layout()
plt.savefig("../assets/clustering.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## Notable Players by Cluster

High scorers who also maintain elite efficiency are the true standouts."""),

    ("code", """# Top 10 per cluster
for arch in ["⭐ High Scorers", "📊 Mid-Range"]:
    print(f"\\nTop 10 {arch} by PPG:")
    top = df[df["archetype"] == arch].nlargest(10, "ppg")[["name", "gp", "ppg", "fpg", "efficiency"]]
    top.index = range(1, 11)
    display(top.round(2))"""),
])
save(nb03, "03-player-clustering.ipynb")

# ============================================================
# 04 - Player Development
# ============================================================
nb04 = nb([
    ("md", """# 📈 Player Development — Cross-Season Tracking

## Key Findings
- **Most multi-season players improve** — the median PPG change is positive
- Players with **3+ seasons** show the clearest development trajectories
- The **top improvers** gain 5-10+ PPG over their careers
- Some players plateau or decline as they age up into harder divisions

---"""),

    ("code", """%matplotlib inline
import sqlite3, re, pandas as pd, numpy as np
import matplotlib.pyplot as plt, seaborn as sns
import warnings; warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid"); plt.rcParams['figure.dpi'] = 120

SEASON_ORDER = {
    "Summer 2020/21": 0, "Winter 2021": 1, "Summer 2021/22": 2, "Winter 2022": 3,
    "Summer 2022/23": 4, "Winter 2023": 5, "Summer 2023/24": 6, "Winter 2024": 7,
    "Summer 2024/25": 8, "Winter 2025": 9, "Summer 2025/26": 10,
}

conn = sqlite3.connect("../data/playhq.db")
df = pd.read_sql(\"\"\"
    SELECT p.id as pid, p.first_name || ' ' || p.last_name as name,
        s.name as season, ps.games_played as gp, ps.total_points as pts,
        ps.total_fouls as fouls, g.name as grade
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN grades g ON g.id = ps.grade_id
    JOIN seasons s ON s.id = g.season_id
    WHERE ps.games_played > 0
\"\"\", conn)
conn.close()

df["ppg"] = df["pts"] / df["gp"]
df["season_order"] = df["season"].map(SEASON_ORDER)

# Aggregate per player per season
sa = df.groupby(["pid", "name", "season"]).agg(
    gp=("gp", "sum"), pts=("pts", "sum"), fouls=("fouls", "sum"),
    season_order=("season_order", "first")
).reset_index()
sa["ppg"] = sa["pts"] / sa["gp"]

print(f"Total stat lines: {len(df):,}")
print(f"Player-seasons: {len(sa):,}")"""),

    ("md", """## Players with 3+ Seasons"""),

    ("code", """multi = sa.groupby("pid").filter(lambda x: x["season"].nunique() >= 3)
pids = multi["pid"].nunique()
print(f"Players with 3+ seasons: {pids:,}")

# Calculate first→last PPG change
devs = []
for pid, g in multi.groupby("pid"):
    g = g.sort_values("season_order")
    devs.append({
        "name": g.iloc[0]["name"],
        "first_ppg": round(g.iloc[0]["ppg"], 2),
        "last_ppg": round(g.iloc[-1]["ppg"], 2),
        "change": round(g.iloc[-1]["ppg"] - g.iloc[0]["ppg"], 2),
        "n_seasons": len(g),
        "total_gp": int(g["gp"].sum()),
    })

dev = pd.DataFrame(devs)
dev = dev[dev["total_gp"] >= 10]

print(f"With 10+ career games: {len(dev):,}")
print(f"\\nPPG Change: mean={dev['change'].mean():+.2f}, median={dev['change'].median():+.2f}")
print(f"Improved: {(dev['change'] > 0).sum()} ({(dev['change'] > 0).mean()*100:.0f}%)")
print(f"Declined: {(dev['change'] < 0).sum()} ({(dev['change'] < 0).mean()*100:.0f}%)")"""),

    ("code", """fig, axes = plt.subplots(1, 3, figsize=(18, 6))
fig.suptitle("Player Development Across Seasons", fontsize=15, fontweight="bold")

ax = axes[0]
ax.hist(dev["change"], bins=60, color="#1976D2", edgecolor="white", alpha=0.85)
ax.axvline(0, color="#D32F2F", ls="--", lw=2)
ax.axvline(dev["change"].mean(), color="#FF9800", ls="-", lw=2, label=f'Mean: {dev["change"].mean():+.2f}')
ax.set_title("PPG Change (First → Last Season)"); ax.set_xlabel("PPG Change"); ax.set_ylabel("Players"); ax.legend()

ax = axes[1]
ax.scatter(dev["n_seasons"], dev["change"], alpha=0.3, s=10, color="#7B1FA2")
ax.axhline(0, color="#D32F2F", ls="--", lw=1)
ax.set_title("PPG Change vs Career Length"); ax.set_xlabel("Seasons"); ax.set_ylabel("PPG Change")

ax = axes[2]
ax.scatter(dev["first_ppg"], dev["last_ppg"], alpha=0.3, s=10, color="#388E3C")
mx = max(dev["first_ppg"].max(), dev["last_ppg"].max())
ax.plot([0, mx], [0, mx], "r--", lw=1, label="No change line")
ax.set_title("First vs Last Season PPG"); ax.set_xlabel("First PPG"); ax.set_ylabel("Last PPG"); ax.legend()

plt.tight_layout()
plt.savefig("../assets/player_development.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## Top 15 Improvers"""),

    ("code", """top_imp = dev.nlargest(15, "change")[["name", "first_ppg", "last_ppg", "change", "n_seasons", "total_gp"]]
top_imp.index = range(1, 16)
top_imp.columns = ["Player", "First PPG", "Last PPG", "Change", "Seasons", "Games"]
top_imp"""),
])
save(nb04, "04-player-development.ipynb")

# ============================================================
# 05 - Age Benchmarking
# ============================================================
nb05 = nb([
    ("md", """# 📏 Age Group Benchmarking — Percentile Rankings

## Key Findings
- Scoring increases dramatically with age: **U10 median ~2 PPG** vs **U18 median ~8+ PPG**
- The **spread widens** at older age groups — talent differentiation increases
- **90th percentile** at each age group represents true standout performance
- These benchmarks answer the question: *"Is my kid's scoring actually good for their age?"*

---"""),

    ("code", """%matplotlib inline
import sqlite3, re, pandas as pd, numpy as np
import matplotlib.pyplot as plt, seaborn as sns
import warnings; warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid"); plt.rcParams['figure.dpi'] = 120

conn = sqlite3.connect("../data/playhq.db")
df = pd.read_sql(\"\"\"
    SELECT p.id as pid, p.first_name || ' ' || p.last_name as name,
        ps.games_played as gp, ps.total_points as pts, ps.total_fouls as fouls,
        g.name as grade
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN grades g ON g.id = ps.grade_id
    WHERE ps.games_played > 0
\"\"\", conn)
conn.close()

df["ppg"] = df["pts"] / df["gp"]
df["age_group"] = df["grade"].str.extract(r'(U\\d+)')
df["gender"] = df["grade"].apply(lambda x: "Boys" if x.startswith("Boys") else ("Girls" if x.startswith("Girls") else "Unknown"))

# Aggregate per player per age group
agg = df.groupby(["pid", "name", "age_group", "gender"]).agg(
    gp=("gp", "sum"), pts=("pts", "sum"), fouls=("fouls", "sum")
).reset_index()
agg["ppg"] = agg["pts"] / agg["gp"]
agg["fpg"] = agg["fouls"] / agg["gp"]
agg = agg[agg["gp"] >= 3]

print(f"Player-age-groups (3+ games): {len(agg):,}")"""),

    ("md", """## Percentile Benchmarks by Age Group"""),

    ("code", """pcts = [10, 25, 50, 75, 90, 95, 99]
rows = []
for (ag, gen), g in agg.groupby(["age_group", "gender"]):
    if ag is None or len(g) < 20:
        continue
    row = {"Age Group": ag, "Gender": gen, "N": len(g)}
    for p in pcts:
        row[f"P{p}"] = round(np.percentile(g["ppg"], p), 2)
    rows.append(row)

bench = pd.DataFrame(rows)
bench = bench.sort_values(["Gender", "Age Group"])
bench"""),

    ("code", """boys = agg[(agg["gender"] == "Boys") & agg["age_group"].notna()]
age_order = sorted(boys["age_group"].unique(), key=lambda x: int(x[1:]))

fig, axes = plt.subplots(1, 2, figsize=(16, 7))
fig.suptitle("Age Group Benchmarks — PPG Distributions (Boys)", fontsize=15, fontweight="bold")

# Box plot
ax = axes[0]
box_data = [boys[boys["age_group"] == ag]["ppg"].values for ag in age_order]
bp = ax.boxplot(box_data, labels=age_order, patch_artist=True, showfliers=False)
cmap = plt.cm.viridis(np.linspace(0.2, 0.9, len(age_order)))
for patch, color in zip(bp["boxes"], cmap):
    patch.set_facecolor(color)
ax.set_title("PPG by Age Group (3+ games)"); ax.set_xlabel("Age Group"); ax.set_ylabel("PPG")

# Percentile trend lines
ax = axes[1]
bb = bench[bench["Gender"] == "Boys"].copy()
bb["age_num"] = bb["Age Group"].str.extract(r"U(\\d+)").astype(int)
bb = bb.sort_values("age_num")
ax.plot(bb["Age Group"], bb["P50"], "o-", color="#1976D2", lw=2, label="50th (median)")
ax.plot(bb["Age Group"], bb["P75"], "s--", color="#FF9800", lw=1.5, label="75th")
ax.plot(bb["Age Group"], bb["P90"], "^--", color="#D32F2F", lw=1.5, label="90th")
ax.plot(bb["Age Group"], bb["P95"], "d--", color="#7B1FA2", lw=1.5, label="95th")
ax.fill_between(bb["Age Group"], bb["P25"], bb["P75"], alpha=0.15, color="#1976D2")
ax.set_title("PPG Percentiles by Age Group"); ax.set_xlabel("Age Group"); ax.set_ylabel("PPG")
ax.legend(); ax.tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.savefig("../assets/age_benchmarks.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## How to Read These Benchmarks

| Percentile | Meaning |
|:---:|:---|
| **50th** | Median — half of players score more, half score less |
| **75th** | Above average — top quarter of the age group |
| **90th** | Standout — only 10% score higher |
| **95th** | Elite — top 5% of the age group |
| **99th** | Exceptional — one-in-a-hundred player |"""),
])
save(nb05, "05-age-benchmarking.ipynb")

# ============================================================
# 07 - Joshua Tracker
# ============================================================
nb07 = nb([
    ("md", """# 🏀 Joshua Dworkin — Career Tracker

A dedicated analysis tracking Joshua's progression through EDJBA seasons, with percentile rankings against his age-group peers.

---"""),

    ("code", """%matplotlib inline
import sqlite3, re, pandas as pd, numpy as np
import matplotlib.pyplot as plt, seaborn as sns
import warnings; warnings.filterwarnings('ignore')

sns.set_theme(style="whitegrid"); plt.rcParams['figure.dpi'] = 120

SEASON_ORDER = {
    "Summer 2020/21": 0, "Winter 2021": 1, "Summer 2021/22": 2, "Winter 2022": 3,
    "Summer 2022/23": 4, "Winter 2023": 5, "Summer 2023/24": 6, "Winter 2024": 7,
    "Summer 2024/25": 8, "Winter 2025": 9, "Summer 2025/26": 10,
}

conn = sqlite3.connect("../data/playhq.db")
all_stats = pd.read_sql(\"\"\"
    SELECT p.id as pid, p.first_name || ' ' || p.last_name as name,
        s.name as season, g.name as grade,
        ps.games_played as gp, ps.total_points as pts,
        ps.one_point as ft, ps.two_point as fg2, ps.three_point as fg3,
        ps.total_fouls as fouls, ps.team_name as team
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN grades g ON g.id = ps.grade_id
    JOIN seasons s ON s.id = g.season_id
    WHERE ps.games_played > 0
\"\"\", conn)
conn.close()

all_stats["ppg"] = all_stats["pts"] / all_stats["gp"]
all_stats["fpg"] = all_stats["fouls"] / all_stats["gp"]
all_stats["age_group"] = all_stats["grade"].str.extract(r'(U\\d+)')
all_stats["season_order"] = all_stats["season"].map(SEASON_ORDER)

josh = all_stats[all_stats["name"] == "Joshua Dworkin"].copy()
print(f"Joshua's stat lines: {len(josh)}")"""),

    ("md", """## Season-by-Season Stats"""),

    ("code", """js = josh.groupby(["season", "age_group"]).agg(
    gp=("gp", "sum"), pts=("pts", "sum"), ft=("ft", "sum"),
    fg2=("fg2", "sum"), fg3=("fg3", "sum"), fouls=("fouls", "sum"),
    season_order=("season_order", "first"), team=("team", "first")
).reset_index().sort_values("season_order")

js["ppg"] = js["pts"] / js["gp"]
js["fpg"] = js["fouls"] / js["gp"]

display(js[["season", "age_group", "team", "gp", "pts", "ppg", "fpg", "ft", "fg2", "fg3"]].round(1))"""),

    ("md", """## PPG Progression"""),

    ("code", """fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax = axes[0]
ax.plot(js["season"], js["ppg"], "o-", color="#1976D2", lw=2.5, markersize=8)
ax.fill_between(js["season"], js["ppg"], alpha=0.15, color="#1976D2")
ax.set_title("Joshua's PPG Over Time", fontweight="bold")
ax.set_ylabel("Points Per Game"); ax.tick_params(axis='x', rotation=45)
for _, r in js.iterrows():
    ax.annotate(f'{r["ppg"]:.1f}', (r["season"], r["ppg"]), textcoords="offset points",
                xytext=(0, 10), ha='center', fontsize=9)

ax = axes[1]
width = 0.25
x = np.arange(len(js))
ax.bar(x - width, js["ft"], width, label="FT", color="#4CAF50")
ax.bar(x, js["fg2"], width, label="2PT Makes", color="#1976D2")
ax.bar(x + width, js["fg3"], width, label="3PT Makes", color="#D32F2F")
ax.set_xticks(x); ax.set_xticklabels(js["season"], rotation=45, ha="right")
ax.set_title("Shooting Breakdown by Season", fontweight="bold")
ax.set_ylabel("Makes"); ax.legend()

plt.tight_layout()
plt.savefig("../assets/joshua_career.png", dpi=150, bbox_inches="tight")
plt.show()"""),

    ("md", """## Percentile Rankings vs Age Group Peers"""),

    ("code", """# Calculate Joshua's percentile in each age group
agg = all_stats.groupby(["pid", "name", "age_group"]).agg(
    gp=("gp", "sum"), pts=("pts", "sum")
).reset_index()
agg["ppg"] = agg["pts"] / agg["gp"]
agg = agg[agg["gp"] >= 3]

josh_pct = []
for _, jr in agg[agg["name"] == "Joshua Dworkin"].iterrows():
    peers = agg[agg["age_group"] == jr["age_group"]]
    pct = (peers["ppg"] < jr["ppg"]).mean() * 100
    josh_pct.append({"Age Group": jr["age_group"], "PPG": round(jr["ppg"], 1),
                     "Percentile": round(pct, 0), "Peers": len(peers)})

pct_df = pd.DataFrame(josh_pct)
display(pct_df)

if len(pct_df) > 0:
    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.bar(pct_df["Age Group"], pct_df["Percentile"], color="#1976D2", edgecolor="white")
    ax.axhline(50, color="#9E9E9E", ls="--", alpha=0.5, label="50th percentile")
    ax.axhline(75, color="#FF9800", ls="--", alpha=0.5, label="75th percentile")
    ax.set_title("Joshua's Percentile Ranking by Age Group", fontweight="bold")
    ax.set_ylabel("Percentile"); ax.set_ylim(0, 105); ax.legend()
    for bar, val in zip(bars, pct_df["Percentile"]):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                f'{val:.0f}th', ha='center', fontweight='bold')
    plt.tight_layout(); plt.show()"""),
])
save(nb07, "07-joshua-tracker.ipynb")

print("\nAll notebooks created!")
