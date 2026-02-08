"""
Database abstraction layer for FullCourtVision.
Provides q() for SQL queries with automatic parquet fallback on Streamlit Cloud.
"""

import os
import sqlite3
import pandas as pd
import streamlit as st

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_BASE_DIR, "data", "playhq.db")
PARQUET_DIR = os.path.join(_BASE_DIR, "data", "parquet")

_USE_SQLITE = os.path.isfile(DB_PATH)


@st.cache_resource
def _get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


@st.cache_data(ttl=3600)
def _load_parquet(table: str) -> pd.DataFrame:
    return pd.read_parquet(os.path.join(PARQUET_DIR, f"{table}.parquet"))


def _all_tables():
    """Load all tables into a dict for in-memory querying."""
    tables = {}
    for f in os.listdir(PARQUET_DIR):
        if f.endswith(".parquet"):
            name = f[:-8]
            tables[name] = _load_parquet(name)
    return tables


if _USE_SQLITE:
    def q(sql, params=None):
        """Execute SQL against SQLite."""
        return pd.read_sql_query(sql, _get_conn(), params=params or [])

    def get_data_source():
        return "SQLite"
else:
    # Parquet mode: load all tables into an in-memory SQLite for SQL compat
    @st.cache_resource
    def _get_memory_conn():
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        tables = _all_tables()
        for name, df in tables.items():
            df.to_sql(name, conn, index=False, if_exists="replace")
        return conn

    def q(sql, params=None):
        """Execute SQL against in-memory SQLite loaded from parquet."""
        return pd.read_sql_query(sql, _get_memory_conn(), params=params or [])

    def get_data_source():
        return "Parquet"
