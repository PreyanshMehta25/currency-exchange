from typing import List, Optional, Dict, Any
import pandas as pd

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

class NaiveBenchmarkForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="naive_benchmark", display_name="Naive Last-Observation Benchmark")
        self.multi_step_strategy = "constant"
        self.interval_method = None

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "NaiveBenchmarkForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations == 0:
            raise ValueError("Training series cannot be empty.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])
        self.is_fitted = True

        self.parameters = {
            "strategy": "y_{t+h} = y_t (Martingale / Random Walk Null)",
            "benchmark_value": round(self.last_observation, 5)
        }
        return self

    def predict(self, horizon: int, future_dates: Optional[List[str]] = None) -> ModelForecastResult:
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict() is called.")

        if future_dates is None:
            future_dates = generate_future_business_dates(self.last_date, horizon)

        preds = [
            ForecastPredictionPoint(
                date=future_dates[h],
                predicted_rate=round(self.last_observation, 5),
                lower_bound=None,
                upper_bound=None
            )
            for h in range(horizon)
        ]

        return ModelForecastResult(
            model_name=self.name,
            display_name=self.display_name,
            parameters=self.parameters,
            training_start=self.training_start,
            training_end=self.training_end,
            training_observations=self.training_observations,
            forecast_horizon=horizon,
            predictions=preds,
            fitting_status="success",
            multi_step_strategy=self.multi_step_strategy,
            interval_method=None
        )

