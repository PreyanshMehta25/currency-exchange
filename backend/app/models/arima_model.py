import logging
import warnings
from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

logger = logging.getLogger(__name__)

class ARIMAForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="arima", display_name="ARIMA")
        self.best_order: Tuple[int, int, int] = (1, 1, 1)
        self.fitted_model = None
        self.multi_step_strategy = "analytical"
        self.interval_method = "Statsmodels 95% Confidence Interval"

    def _determine_d(self, series: np.ndarray) -> int:
        """Determines differencing order d via ADF test."""
        adf_res = adfuller(series, autolag="AIC")
        if adf_res[1] < 0.05:
            return 0  # Stationary already
        # Test 1st difference
        diff1 = np.diff(series)
        adf_diff = adfuller(diff1, autolag="AIC")
        if adf_diff[1] < 0.05:
            return 1
        return 2

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "ARIMAForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations < 30:
            raise ValueError(f"Insufficient training observations ({self.training_observations}) for ARIMA.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])

        # Automatically determine differencing order d
        d_order = self._determine_d(values)

        # Bounded candidate search over p, q around d
        candidates = [
            (1, d_order, 1),
            (0, d_order, 1),
            (1, d_order, 0),
            (2, d_order, 1),
            (1, d_order, 2),
            (2, d_order, 2),
            (0, d_order, 2),
            (2, d_order, 0)
        ]

        best_aic = float("inf")
        best_model = None
        best_order = (1, d_order, 1)

        for p, d, q in candidates:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = ARIMA(values, order=(p, d, q))
                    fitted = model.fit()
                    if np.isfinite(fitted.aic) and fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_model = fitted
                        best_order = (p, d, q)
            except Exception as e:
                continue

        if best_model is None:
            # Fallback to (1, 1, 0)
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = ARIMA(values, order=(1, 1, 0))
                    best_model = model.fit()
                    best_order = (1, 1, 0)
                    best_aic = best_model.aic
            except Exception as e:
                raise RuntimeError(f"ARIMA fitting failed: {e}")

        self.best_order = best_order
        self.fitted_model = best_model
        self.is_fitted = True

        # Residual diagnostics
        residuals = self.fitted_model.resid
        res_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0.0

        self.parameters = {
            "p": int(self.best_order[0]),
            "d": int(self.best_order[1]),
            "q": int(self.best_order[2]),
            "order": f"({self.best_order[0]}, {self.best_order[1]}, {self.best_order[2]})",
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

