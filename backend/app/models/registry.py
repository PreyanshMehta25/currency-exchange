import logging
from typing import Dict, Type, List, Optional
import pandas as pd

from .base import BaseForecaster
from .linear_regression import LinearRegressionForecaster
from .arima_model import ARIMAForecaster
from .sarima_model import SARIMAForecaster
from .holt_model import HoltLinearForecaster
from .random_forest import RandomForestForecaster
from .naive_benchmark import NaiveBenchmarkForecaster
from ..schemas.forecasting import ModelForecastResult

logger = logging.getLogger(__name__)

MODEL_MAP: Dict[str, Type[BaseForecaster]] = {
    "linear_regression": LinearRegressionForecaster,
    "arima": ARIMAForecaster,
    "sarima": SARIMAForecaster,
    "holt": HoltLinearForecaster,
    "random_forest": RandomForestForecaster,
    "naive_benchmark": NaiveBenchmarkForecaster
}

class ModelRegistry:
    @staticmethod
    def get_model(name: str) -> BaseForecaster:
        normalized = name.lower().strip()
        if normalized not in MODEL_MAP:
            raise ValueError(f"Unknown model '{name}'. Supported models: {list(MODEL_MAP.keys())}")
        return MODEL_MAP[normalized]()

    @staticmethod
    def get_primary_models() -> List[str]:
        return ["linear_regression", "arima", "sarima", "holt", "random_forest"]

    @staticmethod
    def run_model_safely(
        model_name: str,
        series: pd.Series,
        dates: pd.Series,
        horizon: int,
        future_dates: Optional[List[str]] = None
    ) -> ModelForecastResult:
        """
        Runs model fitting and prediction with isolated error catching.
        Never crashes caller if an individual model fails.
        """
        try:
            model = ModelRegistry.get_model(model_name)
            model.fit(series, dates)
            return model.predict(horizon, future_dates=future_dates)
        except Exception as e:
            logger.error(f"Error executing model '{model_name}': {e}", exc_info=True)
            return ModelForecastResult(
                model_name=model_name,
                display_name=model_name.replace("_", " ").title(),
                parameters={},
                training_start=str(dates.iloc[0]) if len(dates) > 0 else "",
                training_end=str(dates.iloc[-1]) if len(dates) > 0 else "",
                training_observations=len(series),
                forecast_horizon=horizon,
                predictions=[],
                fitting_status="failed",
                error_message=str(e),
                multi_step_strategy="unknown",
                interval_method=None
            )

model_registry = ModelRegistry()

