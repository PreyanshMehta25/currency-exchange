from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ..schemas.forecasting import ModelForecastResult, ForecastPredictionPoint
from ..utils.date_utils import generate_future_business_dates

class BaseForecaster(ABC):
    """Abstract Base Class for all FX Insight Forecasting Models."""
    
    def __init__(self, name: str, display_name: str):
        self.name = name
        self.display_name = display_name
        self.parameters: Dict[str, Any] = {}
        self.training_start: str = ""
        self.training_end: str = ""
        self.training_observations: int = 0
        self.is_fitted: bool = False
        self.last_observation: float = 0.0
        self.last_date: str = ""
        self.multi_step_strategy: str = "recursive"
        self.interval_method: Optional[str] = None

    @abstractmethod
    def fit(self, series: pd.Series, dates: pd.Series, **kwargs) -> "BaseForecaster":
        """Fits model strictly using training data."""
        pass

    @abstractmethod
    def predict(self, horizon: int, future_dates: Optional[List[str]] = None) -> ModelForecastResult:
        """Generates future forecasts for the specified horizon."""
        pass

