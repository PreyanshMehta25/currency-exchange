from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from ...services.evaluation_service import evaluation_service
from ...schemas.evaluation import BacktestRequest, BacktestResponse, RankingsResponse

router = APIRouter(tags=["Model Evaluation & Backtesting"])

@router.post("/evaluation/backtest", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest):
    try:
        return evaluation_service.run_backtest(
            base=req.base,
            quote=req.quote,
            horizons=req.horizons,
            models=req.models,
            method=req.method,
            initial_train_fraction=req.initial_train_fraction,
            start_date=req.start_date,
            end_date=req.end_date,
            step_stride=req.step_stride or 15
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rolling-origin backtest failed: {str(e)}")

@router.get("/evaluation/rankings", response_model=RankingsResponse)
def get_rankings(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    metric: str = Query("mae", description="Ranking metric: mae, rmse, mape, directional_accuracy"),
    horizon: int = Query(7, description="Forecast horizon (e.g. 7, 15, 30)")
):
    try:
        return evaluation_service.get_rankings(
            base=base,
            quote=quote,
            metric=metric,
            horizon=horizon
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate rankings: {str(e)}")

