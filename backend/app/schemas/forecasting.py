from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ForecastPredictionPoint(BaseModel):
    date: str
    predicted_rate: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

class ModelForecastResult(BaseModel):
    model_name: str
    display_name: str
    parameters: Dict[str, Any]
    training_start: str
    training_end: str
    training_observations: int
    forecast_horizon: int
    predictions: List[ForecastPredictionPoint]
    metrics: Optional[Dict[str, float]] = None
    fitting_status: str  # "success" or "failed"
    error_message: Optional[str] = None
    multi_step_strategy: str  # "recursive", "analytical", or "constant"
    interval_method: Optional[str] = None

class ForecastRequest(BaseModel):
    base: str = Field(..., example="USD")
    quote: str = Field(..., example="INR")
    horizon: int = Field(7, example=7)
    models: List[str] = Field(
        default=["linear_regression", "arima", "sarima", "holt", "random_forest"],
        example=["linear_regression", "arima", "sarima", "holt", "random_forest"]
    )
    start_date: Optional[str] = "2020-01-01"
    end_date: Optional[str] = None
    test_size: Optional[int] = 0  # If > 0, reserve last test_size observations to calculate out-of-sample metrics

class ForecastResponse(BaseModel):
    run_id: str
    base: str
    quote: str
    horizon: int
    last_historical_date: str
    last_historical_rate: float
    forecast_dates: List[str]
    forecasts: Dict[str, ModelForecastResult]
    naive_benchmark: Optional[ModelForecastResult] = None
    created_at: str

class HistoricalPoint(BaseModel):
    date: str
    rate: float

class ForecastCompareResponse(BaseModel):
    run_id: str
    base: str
    quote: str
    horizon: int
    historical_rates: List[HistoricalPoint]
    forecast_dates: List[str]
    models: Dict[str, ModelForecastResult]
    naive_benchmark: ModelForecastResult
    evaluation_metrics: Dict[str, Dict[str, Optional[float]]]
    best_models: Dict[str, str]
    created_at: str

