import numpy as np
import pandas as pd
from typing import List, Optional, Dict, Any
from sklearn.linear_model import LinearRegression

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

class LinearRegressionForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="linear_regression", display_name="Linear Regression")
        self.model: Optional[LinearRegression] = None
        self.lags = [1, 2, 3, 5, 10]
        self.rolling_means = [5, 10]
        self.rolling_stds = [5]
        self.max_lag = 10
        self.history: List[float] = []
        self.residual_std: float = 0.0
        self.multi_step_strategy = "recursive"
        self.interval_method = "Residual Standard Error (1.96 * sigma * sqrt(h))"

    def _extract_features_for_vector(self, hist: List[float]) -> np.ndarray:
        """Extracts engineered features from the end of a history list."""
        feat = []
        # Lags
        for l in self.lags:
            feat.append(hist[-l])
        # Rolling means
        for w in self.rolling_means:
            feat.append(np.mean(hist[-w:]))
        # Rolling stds
        for w in self.rolling_stds:
            s = np.std(hist[-w:], ddof=1) if len(hist[-w:]) > 1 else 0.0
            feat.append(s)
        return np.array(feat).reshape(1, -1)

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "LinearRegressionForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations <= self.max_lag + 10:
            raise ValueError(f"Insufficient training observations ({self.training_observations}) for lag {self.max_lag}.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])
        self.history = list(values)

        X_list = []
        y_list = []
        for t in range(self.max_lag, len(values)):
            hist_t = values[:t]
            x_t = self._extract_features_for_vector(list(hist_t))
            X_list.append(x_t[0])
            y_list.append(values[t])

        X = np.array(X_list)
        y = np.array(y_list)

        self.model = LinearRegression(fit_intercept=True)
        self.model.fit(X, y)
        self.is_fitted = True

        # Residual standard deviation
        in_sample_preds = self.model.predict(X)
        residuals = y - in_sample_preds
        self.residual_std = float(np.std(residuals, ddof=1))

        self.parameters = {
            "lags": self.lags,
            "rolling_means": self.rolling_means,
            "rolling_stds": self.rolling_stds,
            "intercept": round(float(self.model.intercept_), 5),
            "coefficients_count": len(self.model.coef_),
            "residual_std": round(self.residual_std, 5)
        }
        return self

    def predict(self, horizon: int, future_dates: Optional[List[str]] = None) -> ModelForecastResult:
        if not self.is_fitted or self.model is None:
            raise RuntimeError("Model must be fitted before predict() is called.")

        if future_dates is None:
            future_dates = generate_future_business_dates(self.last_date, horizon)

        hist = list(self.history)
        preds = []

        for h in range(1, horizon + 1):
            x = self._extract_features_for_vector(hist)
            y_pred = float(self.model.predict(x)[0])
            hist.append(y_pred)
            
            # Forecast interval expanding with sqrt(h)
            margin = 1.96 * self.residual_std * np.sqrt(h)
            preds.append(ForecastPredictionPoint(
                date=future_dates[h - 1],
                predicted_rate=round(y_pred, 5),
                lower_bound=round(y_pred - margin, 5),
                upper_bound=round(y_pred + margin, 5)
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

