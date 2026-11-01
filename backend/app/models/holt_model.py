import logging
import warnings
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

logger = logging.getLogger(__name__)

class HoltLinearForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="holt", display_name="Holt's Exponential Smoothing")
        self.fitted_model = None
        self.damped: bool = True
        self.residual_std: float = 0.0
        self.multi_step_strategy = "analytical"
        self.interval_method = "Empirical Residual Propagation (1.96 * sigma * sqrt(h))"

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "HoltLinearForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations < 10:
            raise ValueError(f"Insufficient training observations ({self.training_observations}) for Holt.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])

        # Compare damped vs standard Holt using SSE / AIC
        best_sse = float("inf")
        best_model = None
        best_damped = True

        for damped_opt in [True, False]:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = ExponentialSmoothing(
                        values,
                        trend="add",
                        damped_trend=damped_opt,
                        initialization_method="estimated"
                    )
                    fitted = model.fit(optimized=True)
                    if fitted.sse < best_sse:
                        best_sse = fitted.sse
                        best_model = fitted
                        best_damped = damped_opt
            except Exception:
                continue

        if best_model is None:
            # Simple fallback
            model = ExponentialSmoothing(values, trend="add", damped_trend=False)
            best_model = model.fit()
            best_damped = False

        self.fitted_model = best_model
        self.damped = best_damped
        self.is_fitted = True

        residuals = self.fitted_model.resid
        self.residual_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0.0

        smoothing_level = getattr(self.fitted_model.params, "get", lambda k, d=None: None)("smoothing_level")
        smoothing_trend = getattr(self.fitted_model.params, "get", lambda k, d=None: None)("smoothing_trend")
        damping_trend = getattr(self.fitted_model.params, "get", lambda k, d=None: None)("damping_trend")

        self.parameters = {
            "trend": "additive",
            "damped": self.damped,
            "smoothing_level_alpha": round(float(smoothing_level), 4) if smoothing_level is not None else 0.0,
            "smoothing_trend_beta": round(float(smoothing_trend), 4) if smoothing_trend is not None else 0.0,
            "damping_gamma": round(float(damping_trend), 4) if damping_trend is not None else None,
            "sse": round(float(self.fitted_model.sse), 4),
            "residual_std": round(self.residual_std, 5)
        }
        return self

    def predict(self, horizon: int, future_dates: Optional[List[str]] = None) -> ModelForecastResult:
        if not self.is_fitted or self.fitted_model is None:
            raise RuntimeError("Model must be fitted before predict() is called.")

        if future_dates is None:
            future_dates = generate_future_business_dates(self.last_date, horizon)

        forecasts = self.fitted_model.forecast(steps=horizon)

        preds = []
        for h in range(1, horizon + 1):
            p_val = float(forecasts[h - 1])
            margin = 1.96 * self.residual_std * np.sqrt(h)
            preds.append(ForecastPredictionPoint(
                date=future_dates[h - 1],
                predicted_rate=round(p_val, 5),
                lower_bound=round(p_val - margin, 5),
                upper_bound=round(p_val + margin, 5)
            ))

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
            interval_method=self.interval_method
        )

