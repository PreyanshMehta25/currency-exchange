from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class SummaryStats(BaseModel):
    mean: float
    median: float
    std: float
    variance: float
    min: float
    max: float
    range: float
    skewness: float
    kurtosis: float
    count: int

class DescriptiveStatisticsResponse(BaseModel):
    base: str
    quote: str
    start_date: str
    end_date: str
    count: int
    levels_stats: SummaryStats
    returns_stats: SummaryStats
    diff_stats: SummaryStats

class StationarityTestResult(BaseModel):
    test_name: str
    null_hypothesis: str
    test_statistic: float
    p_value: float
    critical_values: Dict[str, float]
    lags_used: int
    is_stationary: bool
    interpretation: str

class StationarityResponse(BaseModel):
    base: str
    quote: str
    series_name: str
    levels_adf: StationarityTestResult
    levels_kpss: StationarityTestResult
    differenced_adf: StationarityTestResult
    differenced_kpss: StationarityTestResult
    overall_conclusion: str

class DecompositionPoint(BaseModel):
    date: str
    observed: float
    trend: Optional[float] = None
    seasonal: Optional[float] = None
    residual: Optional[float] = None

class DecompositionResponse(BaseModel):
    base: str
    quote: str
    model_type: str  # "additive" or "multiplicative"
    period: int
    data: List[DecompositionPoint]
    seasonal_variance_ratio: float
    interpretation: str
    is_meaningful: bool

class VolatilityPoint(BaseModel):
    date: str
    volatility: float
    rolling_mean: Optional[float] = None

class VolatilityResponse(BaseModel):
    base: str
    quote: str
    window: int
    annualized: bool
    series: List[VolatilityPoint]

class AcfPacfLag(BaseModel):
    lag: int
    acf: float
    pacf: float
    conf_upper: float
    conf_lower: float

class AcfPacfResponse(BaseModel):
    base: str
    quote: str
    max_lags: int
    lags: List[AcfPacfLag]
    differenced: bool

