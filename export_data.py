"""Export playhq.db tables to compressed parquet files for Streamlit Cloud deployment."""

import os
import sqlite3
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "playhq.db")
OUT_DIR = os.path.join(os.path.dirname(__file__), "data", "parquet")

TABLES = [
    "organisations", "competitions", "seasons", "grades", "teams",
    "players", "player_stats", "games", "rounds",
]

def export():
    os.makedirs(OUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)

    for table in TABLES:
        print(f"Exporting {table}...", end=" ")
        df = pd.read_sql_query(f"SELECT * FROM [{table}]", conn)
        path = os.path.join(OUT_DIR, f"{table}.parquet")
        df.to_parquet(path, engine="pyarrow", compression="gzip", index=False)
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"{len(df):,} rows -> {size_mb:.2f} MB")

    conn.close()
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print(f"\nTotal parquet size: {total / (1024*1024):.2f} MB")

if __name__ == "__main__":
    export()
