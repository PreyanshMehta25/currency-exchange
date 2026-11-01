import uuid
import logging
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd

from .data_pipeline import data_pipeline
from ..models.registry import model_registry
from ..utils.metrics import calculate_all_metrics
from ..utils.storage import save_evaluation_run, get_latest_evaluation_run
from ..schemas.evaluation import (
    ModelMetrics, HorizonEvaluationResult, BacktestResponse,
    ModelRankingItem, RankingsResponse
)

logger = logging.getLogger(__name__)

class EvaluationService:
    def run_backtest(
        self,
        base: str,
        quote: str,
        horizons: List[int] = [7, 15, 30],
        models: Optional[List[str]] = None,
        method: str = "expanding",
        initial_train_fraction: float = 0.70,
        start_date: Optional[str] = "2020-01-01",
        end_date: Optional[str] = None,
        step_stride: int = 15
    ) -> BacktestResponse:
        """
        Executes rolling-origin backtesting across specified horizons and models.
        Strictly chronological. Evaluates models on identical out-of-sample slices.
        """
        if models is None:
            models = model_registry.get_primary_models()

        df = data_pipeline.get_processed_dataframe(base, quote, start_date=start_date, end_date=end_date)
        n_total = len(df)
        if n_total < 80:
            raise ValueError(f"Insufficient observations ({n_total}) for rolling-origin evaluation.")

        initial_train_size = int(n_total * initial_train_fraction)
        max_horizon = max(horizons)

        if initial_train_size + max_horizon >= n_total:
            initial_train_size = n_total - max_horizon - 5

        # We will collect predictions and actuals per horizon and per model
        # horizon -> model_name -> list of (actual, pred)
        horizon_storage: Dict[int, Dict[str, Dict[str, List[float]]]] = {
            h: {m: {"actual": [], "pred": []} for m in models + ["naive_benchmark"]}
            for h in horizons
        }
        
        # Origin indices
        origin_indices = list(range(initial_train_size, n_total - max_horizon, step_stride))
        if not origin_indices:
            origin_indices = [initial_train_size]

        logger.info(f"Running rolling-origin backtest for {base}/{quote}: {len(origin_indices)} origins, method={method}")

        for origin_idx in origin_indices:
            if method == "rolling":
                train_slice = df.iloc[origin_idx - initial_train_size : origin_idx]
            else:  # "expanding"
                train_slice = df.iloc[0:origin_idx]

            train_series = train_slice["exchange_rate"]
            train_dates = train_slice["date"]
            last_train_obs = float(train_series.iloc[-1])

            # For each horizon, evaluate
            for h in horizons:
                test_slice = df.iloc[origin_idx : origin_idx + h]
                actual_vals = test_slice["exchange_rate"].tolist()
                test_dates = test_slice["date"].tolist()

                # Naive benchmark
                naive_preds = [last_train_obs] * h
                horizon_storage[h]["naive_benchmark"]["actual"].extend(actual_vals)
                horizon_storage[h]["naive_benchmark"]["pred"].extend(naive_preds)

                # Each model
                for m_name in models:
                    try:
                        res = model_registry.run_model_safely(
                            m_name, train_series, train_dates, h, future_dates=test_dates
                        )
                        if res.fitting_status == "success" and len(res.predictions) == h:
                            preds = [p.predicted_rate for p in res.predictions]
                            horizon_storage[h][m_name]["actual"].extend(actual_vals)
                            horizon_storage[h][m_name]["pred"].extend(preds)
                    except Exception as err:
                        logger.warning(f"Error in backtest origin={origin_idx}, model={m_name}: {err}")

        # Compute aggregate metrics per horizon
        results_by_horizon: Dict[int, HorizonEvaluationResult] = {}
        naive_by_horizon: Dict[int, ModelMetrics] = {}

        for h in horizons:
            model_metrics_map: Dict[str, ModelMetrics] = {}
            for m_name in models:
                act = horizon_storage[h][m_name]["actual"]
                prd = horizon_storage[h][m_name]["pred"]
                if act and prd:
                    mets = calculate_all_metrics(act, prd)
                    model_metrics_map[m_name] = ModelMetrics(**mets)
                else:
                    model_metrics_map[m_name] = ModelMetrics(
                        mae=999.0, rmse=999.0, mape=999.0, smape=999.0, directional_accuracy=0.0, n_observations=0
                    )

            # Benchmark metrics
            bench_act = horizon_storage[h]["naive_benchmark"]["actual"]
            bench_prd = horizon_storage[h]["naive_benchmark"]["pred"]
            bench_mets = calculate_all_metrics(bench_act, bench_prd)
            naive_by_horizon[h] = ModelMetrics(**bench_mets)

            # Determine best models
            valid_models = [m for m in models if model_metrics_map[m].n_observations > 0]
            if valid_models:
                best_mae = min(valid_models, key=lambda m: model_metrics_map[m].mae)
                best_rmse = min(valid_models, key=lambda m: model_metrics_map[m].rmse)
                best_mape = min(valid_models, key=lambda m: model_metrics_map[m].mape)
                best_da = max(valid_models, key=lambda m: model_metrics_map[m].directional_accuracy)
            else:
                best_mae = best_rmse = best_mape = best_da = "none"

            results_by_horizon[h] = HorizonEvaluationResult(
                horizon=h,
                models=model_metrics_map,
                best_model_by_mae=best_mae,
                best_model_by_rmse=best_rmse,
                best_model_by_mape=best_mape,
                best_model_by_da=best_da
            )

        run_id = f"backtest_{uuid.uuid4().hex[:10]}"
        response = BacktestResponse(
            run_id=run_id,
            base=base.upper(),
            quote=quote.upper(),
            method=method,
            initial_train_fraction=initial_train_fraction,
            horizons_evaluated=horizons,
            results_by_horizon=results_by_horizon,
            naive_benchmark_by_horizon=naive_by_horizon,
            created_at=pd.Timestamp.utcnow().isoformat()
        )

        # Save to SQLite
        try:
            save_evaluation_run(
                run_id=run_id,
                base=base.upper(),
                quote=quote.upper(),
                method=method,
                initial_fraction=initial_train_fraction,
                horizons=horizons,
                results=response.dict()
            )
        except Exception as e:
            logger.warning(f"Failed to persist evaluation run: {e}")

        return response

    def get_rankings(
        self,
        base: str = "USD",
        quote: str = "INR",
        metric: str = "mae",
        horizon: int = 7
    ) -> RankingsResponse:
        """Retrieves or calculates rankings for a given metric and horizon."""
        metric = metric.lower()
        latest = get_latest_evaluation_run(base.upper(), quote.upper())
        
        if not latest:
            # Run a standard backtest if none exists yet
            run = self.run_backtest(base, quote, horizons=[horizon], step_stride=20)
            data = run.dict()
        else:
            data = latest["results"]

        horizon_str = str(horizon)
        results_by_h = data.get("results_by_horizon", {})
        h_data = results_by_h.get(horizon_str) or results_by_h.get(horizon)

        if not h_data:
            # Run evaluation for this horizon
            run = self.run_backtest(base, quote, horizons=[horizon], step_stride=20)
            data = run.dict()
            h_data = data["results_by_horizon"].get(str(horizon)) or data["results_by_horizon"].get(horizon)

        models_map = h_data.get("models", {})
        rank_items = []

        for m_name, mets in models_map.items():
            val = mets.get(metric, 0.0)
            rank_items.append({
                "model_name": m_name,
                "display_name": m_name.replace("_", " ").title(),
                "metric_value": val,
                "metric_name": metric.upper(),
                "horizon": horizon,
                "currency_pair": f"{base.upper()}/{quote.upper()}"
            })

        # Higher is better for directional_accuracy; lower is better for errors
        reverse_sort = (metric in ["directional_accuracy", "da"])
        rank_items.sort(key=lambda x: x["metric_value"], reverse=reverse_sort)

        final_ranks = [
            ModelRankingItem(
                rank=idx + 1,
                model_name=item["model_name"],
                display_name=item["display_name"],
                metric_value=item["metric_value"],
                metric_name=item["metric_name"],
                horizon=item["horizon"],
                currency_pair=item["currency_pair"]
            )
            for idx, item in enumerate(rank_items)
        ]

        return RankingsResponse(
            metric=metric.upper(),
            horizon=horizon,
            rankings=final_ranks
        )

evaluation_service = EvaluationService()

