from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RateItem(BaseModel):
    date: str
    base: str
    quote: str
    rate: float
    data_source: Optional[str] = "Frankfurter v2"
    is_derived: Optional[bool] = False

class RatesResponse(BaseModel):
    base: str
    quote: str
    start_date: str
    end_date: str
    count: int
    data_source: str
    rates: List[RateItem]

class LatestRatesResponse(BaseModel):
    base: str
    rates: List[RateItem]
    timestamp: Optional[str] = None

class DataRefreshRequest(BaseModel):
    base: str = Field(..., example="USD")
    quote: str = Field(..., example="INR")
    start_date: Optional[str] = Field("2015-01-01", example="2015-01-01")
    end_date: Optional[str] = None
    force_refresh: Optional[bool] = False

class DataQualityReport(BaseModel):
    base: str
    quote: str
    start_date: str
    end_date: str
    total_observations: int
    expected_business_days: int
    missing_observations: int
    duplicate_observations: int
    outlier_count: int
    mean_rate: float
    median_rate: float
    std_rate: float
    min_rate: float
    max_rate: float
    percentage_change: float
    data_source: str
    is_cached: bool
    last_refresh: Optional[str] = None
    data_quality_flags: List[str] = []

