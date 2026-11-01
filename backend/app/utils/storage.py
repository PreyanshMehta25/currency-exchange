import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from ..config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Metadata / Cache table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS metadata_cache (
        cache_key TEXT PRIMARY KEY,
        cache_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # Forecast runs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecast_runs (
        id TEXT PRIMARY KEY,
        base_currency TEXT NOT NULL,
        quote_currency TEXT NOT NULL,
        horizon INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        forecast_dates TEXT NOT NULL,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    
    # Evaluation / backtest runs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_runs (
        id TEXT PRIMARY KEY,
        base_currency TEXT NOT NULL,
        quote_currency TEXT NOT NULL,
        method TEXT NOT NULL,
        initial_fraction REAL NOT NULL,
        horizons_json TEXT NOT NULL,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    
    conn.commit()
    conn.close()

# Auto-initialize DB tables on module load
try:
    init_db()
except Exception:
    pass

def save_cache_metadata(key: str, value: Any):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().isoformat()
    val_str = json.dumps(value)
    cursor.execute(
        "INSERT OR REPLACE INTO metadata_cache (cache_key, cache_value, updated_at) VALUES (?, ?, ?)",
        (key, val_str, now_str)
    )
    conn.commit()
    conn.close()

def get_cache_metadata(key: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT cache_value, updated_at FROM metadata_cache WHERE cache_key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "value": json.loads(row["cache_value"]),
            "updated_at": row["updated_at"]
        }
    return None

def save_forecast_run(
    run_id: str,
    base: str,
    quote: str,
    horizon: int,
    start_date: str,
    end_date: str,
    forecast_dates: List[str],
    results: Dict[str, Any]
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO forecast_runs 
        (id, base_currency, quote_currency, horizon, start_date, end_date, forecast_dates, results_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        base,
        quote,
        horizon,
        start_date,
        end_date,
        json.dumps(forecast_dates),
        json.dumps(results),
        now_str
    ))
    conn.commit()
    conn.close()

def get_forecast_run(run_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM forecast_runs WHERE id = ?", (run_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "run_id": row["id"],
            "base": row["base_currency"],
            "quote": row["quote_currency"],
            "horizon": row["horizon"],
            "start_date": row["start_date"],
            "end_date": row["end_date"],
            "forecast_dates": json.loads(row["forecast_dates"]),
            "results": json.loads(row["results_json"]),
            "created_at": row["created_at"]
        }
    return None

def list_forecast_runs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, base_currency, quote_currency, horizon, start_date, end_date, created_at FROM forecast_runs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "run_id": r["id"],
            "base": r["base_currency"],
            "quote": r["quote_currency"],
            "horizon": r["horizon"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "created_at": r["created_at"]
        }
        for r in rows
    ]

def save_evaluation_run(
    run_id: str,
    base: str,
    quote: str,
    method: str,
    initial_fraction: float,
    horizons: List[int],
    results: Dict[str, Any]
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO evaluation_runs 
        (id, base_currency, quote_currency, method, initial_fraction, horizons_json, results_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        base,
        quote,
        method,
        initial_fraction,
        json.dumps(horizons),
        json.dumps(results),
        now_str
    ))
    conn.commit()
    conn.close()

def get_latest_evaluation_run(base: str, quote: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM evaluation_runs WHERE base_currency = ? AND quote_currency = ? ORDER BY created_at DESC LIMIT 1",
        (base, quote)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "run_id": row["id"],
            "base": row["base_currency"],
            "quote": row["quote_currency"],
            "method": row["method"],
            "initial_fraction": row["initial_fraction"],
            "horizons": json.loads(row["horizons_json"]),
            "results": json.loads(row["results_json"]),
            "created_at": row["created_at"]
        }
    return None
