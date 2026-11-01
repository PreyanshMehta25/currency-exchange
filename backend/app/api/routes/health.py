from fastapi import APIRouter
from datetime import datetime
from ...config import settings
from ...utils.storage import get_db_connection

router = APIRouter(tags=["System"])

@router.get("/health")
def health_check():
    db_status = "healthy"
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/metadata")
def get_metadata():
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "supported_models": settings.SUPPORTED_MODELS,
        "supported_horizons": settings.SUPPORTED_HORIZONS,
        "recommended_pairs": settings.RECOMMENDED_PAIRS,
        "default_history_years": settings.DEFAULT_HISTORY_YEARS,
        "api_source": "Frankfurter API v2",
        "endpoints": {
            "currencies": "/api/currencies",
            "providers": "/api/providers",
            "rates_latest": "/api/rates/latest",
            "rates_history": "/api/rates/history",
            "analysis_stats": "/api/analysis/statistics",
            "analysis_stationarity": "/api/analysis/stationarity",
            "analysis_decomposition": "/api/analysis/decomposition",
            "forecast": "/api/forecast",
            "forecast_compare": "/api/forecast/compare",
            "evaluation_backtest": "/api/evaluation/backtest",
            "evaluation_rankings": "/api/evaluation/rankings"
        }
    }

