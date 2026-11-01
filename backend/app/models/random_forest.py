import logging
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from .base import BaseForecaster
from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

logger = logging.getLogger(__name__)

class RandomForestForecaster(BaseForecaster):
    def __init__(self, n_estimators: int = 150, max_depth: int = 8):
        super().__init__(name="random_forest", display_name="Random Forest Regression")
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.model: Optional[RandomForestRegressor] = None
        self.lags = [1, 2, 3, 5, 10]
        self.rolling_means = [5, 10]
        self.rolling_stds = [5]
        self.max_lag = 10
        self.history: List[float] = []
        self.multi_step_strategy = "recursive"
        self.interval_method = "Ensemble Tree Variance (10th-90th percentiles across estimators)"

    def _extract_features(self, hist: List[float]) -> np.ndarray:
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
        # Lagged percentage return: (y_t - y_{t-1}) / y_{t-1}
        prev1 = hist[-1]
        prev2 = hist[-2] if len(hist) > 1 else prev1
        pct_ret = ((prev1 - prev2) / prev2) * 100.0 if prev2 != 0 else 0.0
        feat.append(pct_ret)
        
        return np.array(feat).reshape(1, -1)

    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "RandomForestForecaster":
        values = series.values.astype(float)
        self.training_observations = len(values)
        if self.training_observations <= self.max_lag + 15:
            raise ValueError(f"Insufficient training observations ({self.training_observations}) for Random Forest.")

        self.training_start = str(dates.iloc[0])
        self.training_end = str(dates.iloc[-1])
        self.last_observation = float(values[-1])
        self.last_date = str(dates.iloc[-1])
        self.history = list(values)

        X_list = []
        y_list = []
        for t in range(self.max_lag, len(values)):
            hist_t = values[:t]
            x_t = self._extract_features(list(hist_t))
            X_list.append(x_t[0])
            y_list.append(values[t])

        X = np.array(X_list)
        y = np.array(y_list)

        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X, y)
        self.is_fitted = True

        feature_names = [f"lag_{l}" for l in self.lags] + \
                        [f"roll_mean_{w}" for w in self.rolling_means] + \
                        [f"roll_std_{w}" for w in self.rolling_stds] + \
                        ["pct_return_lag1"]

        importances = dict(zip(feature_names, [round(float(imp), 4) for imp in self.model.feature_importances_]))

        self.parameters = {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "feature_importances": importances
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
            x = self._extract_features(hist)
            y_pred = float(self.model.predict(x)[0])
            hist.append(y_pred)

            # Extract predictions from each decision tree to construct ensemble bounds
            tree_preds = [float(tree.predict(x)[0]) for tree in self.model.estimators_]
            lower = float(np.percentile(tree_preds, 10))
            upper = float(np.percentile(tree_preds, 90))

            preds.append(ForecastPredictionPoint(
                date=future_dates[h - 1],
                predicted_rate=round(y_pred, 5),
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

