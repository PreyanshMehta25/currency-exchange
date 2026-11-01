import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Path as FastPath
from typing import Optional, Dict, Any, List
import pandas as pd

from ...services.data_pipeline import data_pipeline
from ...models.registry import model_registry
from ...utils.date_utils import generate_future_business_dates
from ...utils.metrics import calculate_all_metrics
from ...utils.storage import save_forecast_run, get_forecast_run, list_forecast_runs
from ...schemas.forecasting import (
    ForecastRequest, ForecastResponse, ForecastCompareResponse,
    ModelForecastResult, HistoricalPoint
)

router = APIRouter(tags=["Forecasting"])

@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(req: ForecastRequest):
    df = data_pipeline.get_processed_dataframe(
        base=req.base,
        quote=req.quote,
        start_date=req.start_date,
        end_date=req.end_date
    )
    if len(df) < 50:
        raise HTTPException(status_code=400, detail=f"Insufficient observations ({len(df)}) for reliable forecasting.")

    series = df["exchange_rate"]
    dates = df["date"]
    last_date = str(dates.iloc[-1])
    last_rate = float(series.iloc[-1])

    # Future dates
    future_dates = generate_future_business_dates(last_date, req.horizon)

    forecast_results: Dict[str, ModelForecastResult] = {}
    for m_name in req.models:
        res = model_registry.run_model_safely(
            model_name=m_name,
            series=series,
            dates=dates,
            horizon=req.horizon,
            future_dates=future_dates
        )
        forecast_results[m_name] = res

    # Naive benchmark
    naive_res = model_registry.run_model_safely(
        model_name="naive_benchmark",
        series=series,
        dates=dates,
        horizon=req.horizon,
        future_dates=future_dates
    )

    run_id = f"fc_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.utcnow().isoformat()

    response = ForecastResponse(
        run_id=run_id,
        base=req.base.upper(),
        quote=req.quote.upper(),
        horizon=req.horizon,
        last_historical_date=last_date,
        last_historical_rate=last_rate,
        forecast_dates=future_dates,
        forecasts=forecast_results,
        naive_benchmark=naive_res,
        created_at=now_iso
    )

    # Persist run to SQLite
    try:
        save_forecast_run(
            run_id=run_id,
            base=req.base.upper(),
            quote=req.quote.upper(),
            horizon=req.horizon,
            start_date=str(dates.iloc[0]),
            end_date=last_date,
            forecast_dates=future_dates,
            results=response.dict()
        )
    except Exception:
        pass

    return response

@router.post("/forecast/compare", response_model=ForecastCompareResponse)
def compare_forecasts(req: ForecastRequest):
    """
    Runs all 5 primary forecasting models plus the Naive benchmark.
    If test_size is 0, evaluates in-sample holdout (last horizon observations)
    for fair out-of-sample metric comparison, while also generating future forecasts.
    """
    df = data_pipeline.get_processed_dataframe(
        base=req.base,
        quote=req.quote,
        start_date=req.start_date,
        end_date=req.end_date
    )
    if len(df) < 60:
        raise HTTPException(status_code=400, detail=f"Insufficient observations ({len(df)}) for comparison.")

    # Chronological holdout test set to fairly evaluate metrics
    eval_horizon = req.horizon
    train_slice = df.iloc[:-eval_horizon]
    test_slice = df.iloc[-eval_horizon:]

    train_series = train_slice["exchange_rate"]
    train_dates = train_slice["date"]
    actual_holdout = test_slice["exchange_rate"].values
    holdout_dates = test_slice["date"].tolist()

    all_models = model_registry.get_primary_models()
    model_results: Dict[str, ModelForecastResult] = {}
    metrics_map: Dict[str, Dict[str, Optional[float]]] = {}

    for m_name in all_models:
        res = model_registry.run_model_safely(
            model_name=m_name,
            series=train_series,
            dates=train_dates,
            horizon=eval_horizon,
            future_dates=holdout_dates
        )
        if res.fitting_status == "success" and len(res.predictions) == eval_horizon:
            pred_vals = [p.predicted_rate for p in res.predictions]
            m_metrics = calculate_all_metrics(actual_holdout, pred_vals, prev_observation=float(train_series.iloc[-1]))
            res.metrics = m_metrics
            metrics_map[m_name] = m_metrics
        else:
            res.metrics = None
            metrics_map[m_name] = {"mae": None, "rmse": None, "mape": None, "directional_accuracy": None}

        model_results[m_name] = res

    # Benchmark
    naive_res = model_registry.run_model_safely(
        model_name="naive_benchmark",
        series=train_series,
        dates=train_dates,
        horizon=eval_horizon,
        future_dates=holdout_dates
    )
    naive_preds = [p.predicted_rate for p in naive_res.predictions]
    naive_metrics = calculate_all_metrics(actual_holdout, naive_preds, prev_observation=float(train_series.iloc[-1]))
    naive_res.metrics = naive_metrics
    metrics_map["naive_benchmark"] = naive_metrics

    # Best model selection by each metric
    valid_primary = [m for m in all_models if metrics_map[m].get("mae") is not None]
    best_models = {
        "mae": min(valid_primary, key=lambda m: metrics_map[m]["mae"]) if valid_primary else "none",
        "rmse": min(valid_primary, key=lambda m: metrics_map[m]["rmse"]) if valid_primary else "none",
        "mape": min(valid_primary, key=lambda m: metrics_map[m]["mape"]) if valid_primary else "none",
        "directional_accuracy": max(valid_primary, key=lambda m: metrics_map[m]["directional_accuracy"]) if valid_primary else "none"
    }

    # Historical sample for chart (last 90 observations)
    hist_sample = [
        HistoricalPoint(date=r["date"], rate=float(r["exchange_rate"]))
        for _, r in df.iloc[-90:].iterrows()
    ]

    run_id = f"cmp_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.utcnow().isoformat()

    return ForecastCompareResponse(
        run_id=run_id,
        base=req.base.upper(),
        quote=req.quote.upper(),
        horizon=eval_horizon,
        historical_rates=hist_sample,
        forecast_dates=holdout_dates,
        models=model_results,
        naive_benchmark=naive_res,
        evaluation_metrics=metrics_map,
        best_models=best_models,
        created_at=now_iso
    )

@router.get("/forecast/history")
def get_forecast_history(limit: int = Query(20, le=100)):
    return {"runs": list_forecast_runs(limit=limit)}

@router.get("/forecast/{run_id}")
def get_forecast_details(run_id: str = FastPath(...)):
    res = get_forecast_run(run_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Forecast run '{run_id}' not found.")
    return res

