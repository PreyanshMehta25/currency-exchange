import os
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "FX Insight"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    FRANKFURTER_BASE_URL: str = "https://api.frankfurter.dev"
    
    # Storage paths
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = BASE_DIR / "data" / "raw"
    PROCESSED_DATA_DIR: Path = BASE_DIR / "data" / "processed"
    CACHE_DATA_DIR: Path = BASE_DIR / "data" / "cache"
    DB_PATH: Path = BASE_DIR / "data" / "fx_insight.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    
    # Config parameters
    DEFAULT_HISTORY_YEARS: int = 10
    DEFAULT_CACHE_HOURS: int = 24
    REQUEST_TIMEOUT_SECONDS: int = 15
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_FACTOR: float = 1.5
    
    # Recommended pairs
    RECOMMENDED_PAIRS: List[str] = [
        "USD/INR",
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "EUR/INR",
        "GBP/INR",
        "AUD/USD",
        "USD/CHF",
    ]
    
    # Supported forecast horizons
    SUPPORTED_HORIZONS: List[int] = [7, 15, 30]
    
    # Supported models
    SUPPORTED_MODELS: List[str] = [
        "linear_regression",
        "arima",
        "sarima",
        "holt",
        "random_forest"
    ]

settings = Settings()

# Ensure required directories exist
for directory in [
    settings.DATA_DIR,
    settings.RAW_DATA_DIR,
    settings.PROCESSED_DATA_DIR,
    settings.CACHE_DATA_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

