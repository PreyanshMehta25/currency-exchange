import logging
import warnings
from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

logger = logging.getLogger(__name__)

class SARIMAForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="sarima", display_name="SARIMA")
        self.order: Tuple[int, int, int] = (1, 1, 1)
        self.seasonal_order: Tuple[int, int, int, int] = (1, 0, 0, 5)
        self.fitted_model = None
        self.multi_step_strategy = "analytical"
        self.interval_method = "Statsmodels 95% Confidence Interval"

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "SARIMAForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations < 40:
            raise ValueError(f"Insufficient training observations ({self.training_observations}) for SARIMA.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])

        # Candidate configurations with 5-day (trading week) seasonal periodicity
        candidates = [
            ((1, 1, 1), (1, 0, 0, 5)),
            ((1, 1, 0), (1, 0, 0, 5)),
            ((0, 1, 1), (0, 0, 1, 5)),
            ((1, 1, 1), (0, 0, 1, 5)),
            ((1, 1, 0), (0, 0, 0, 5))
        ]

        best_aic = float("inf")
        best_model = None
        best_ord = (1, 1, 1)
        best_seas = (1, 0, 0, 5)

        for ord_cand, seas_cand in candidates:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = SARIMAX(
                        values,
                        order=ord_cand,
                        seasonal_order=seas_cand,
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    fitted = model.fit(disp=False, maxiter=50)
                    if np.isfinite(fitted.aic) and fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_model = fitted
                        best_ord = ord_cand
                        best_seas = seas_cand
            except Exception:
                continue

        if best_model is None:
            # Fallback
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = SARIMAX(
                        values,
                        order=(1, 1, 0),
                        seasonal_order=(0, 0, 0, 5),
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    best_model = model.fit(disp=False, maxiter=30)
                    best_ord = (1, 1, 0)
                    best_seas = (0, 0, 0, 5)
            except Exception as e:
                raise RuntimeError(f"SARIMA fitting failed: {e}")

        self.order = best_ord
        self.seasonal_order = best_seas
        self.fitted_model = best_model
        self.is_fitted = True

        residuals = self.fitted_model.resid
        res_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0.0

        self.parameters = {
            "order": f"({self.order[0]}, {self.order[1]}, {self.order[2]})",
            "seasonal_order": f"({self.seasonal_order[0]}, {self.seasonal_order[1]}, {self.seasonal_order[2]}, {self.seasonal_order[3]})",
            "seasonal_period": self.seasonal_order[3],
            "aic": round(float(self.fitted_model.aic), 2),
            "bic": round(float(self.fitted_model.bic), 2),
            "residual_std": round(res_std, 5)
        }
        return self

    def predict(self, horizon: int, future_dates: Optional[List[str]] = None) -> ModelForecastResult:
        if not self.is_fitted or self.fitted_model is None:
            raise RuntimeError("Model must be fitted before predict() is called.")

        if future_dates is None:
            future_dates = generate_future_business_dates(self.last_date, horizon)

        forecast_obj = self.fitted_model.get_forecast(steps=horizon)
        predicted_mean = forecast_obj.predicted_mean
        conf_int = forecast_obj.conf_int(alpha=0.05)

        preds = []
        for h in range(horizon):
            p_val = float(predicted_mean[h])
            lower = float(conf_int[h, 0])
            upper = float(conf_int[h, 1])
            preds.append(ForecastPredictionPoint(
                date=future_dates[h],
                predicted_rate=round(p_val, 5),
                lower_bound=round(lower, 5),
                upper_bound=round(upper, 5)
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

