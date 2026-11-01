from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ModelMetrics(BaseModel):
    mae: float
    rmse: float
    mape: float
    smape: float
    directional_accuracy: float
    n_observations: int

class BacktestStepResult(BaseModel):
    step_index: int
    train_end_date: str
    test_start_date: str
    test_end_date: str
    actual_values: List[float]
    model_predictions: Dict[str, List[float]]

class HorizonEvaluationResult(BaseModel):
    horizon: int
    models: Dict[str, ModelMetrics]
    best_model_by_mae: str
    best_model_by_rmse: str
    best_model_by_mape: str
    best_model_by_da: str

class BacktestRequest(BaseModel):
    base: str = Field("USD", example="USD")
    quote: str = Field("INR", example="INR")
    horizons: List[int] = Field(default=[7, 15, 30], example=[7, 15, 30])
    models: List[str] = Field(
        default=["linear_regression", "arima", "sarima", "holt", "random_forest"],
        example=["linear_regression", "arima", "sarima", "holt", "random_forest"]
    )
    method: str = Field("expanding", example="expanding")  # "expanding" or "rolling"
    initial_train_fraction: float = Field(0.70, ge=0.5, le=0.85)
    start_date: Optional[str] = "2020-01-01"
    end_date: Optional[str] = None
    step_stride: Optional[int] = 10  # Evaluate every N business days to balance thoroughness and speed

class BacktestResponse(BaseModel):
    run_id: str
    base: str
    quote: str
    method: str
    initial_train_fraction: float
    horizons_evaluated: List[int]
    results_by_horizon: Dict[int, HorizonEvaluationResult]
    naive_benchmark_by_horizon: Dict[int, ModelMetrics]
    created_at: str

class ModelRankingItem(BaseModel):
    rank: int
    model_name: str
    display_name: str
    metric_value: float
    metric_name: str
    horizon: int
    currency_pair: str

class RankingsResponse(BaseModel):
    metric: str
    horizon: int
    rankings: List[ModelRankingItem]

