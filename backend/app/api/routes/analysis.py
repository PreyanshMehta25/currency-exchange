from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ...services.eda_service import eda_service
from ...schemas.analysis import (
    DescriptiveStatisticsResponse, StationarityResponse,
    DecompositionResponse, VolatilityResponse, AcfPacfResponse
)

router = APIRouter(tags=["Exploratory Data Analysis (EDA)"])

@router.get("/analysis/statistics", response_model=DescriptiveStatisticsResponse)
def get_statistics(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    try:
        return eda_service.get_descriptive_statistics(base, quote, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate statistics: {str(e)}")

@router.get("/analysis/stationarity", response_model=StationarityResponse)
def get_stationarity(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    try:
        return eda_service.get_stationarity_tests(base, quote, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to perform stationarity tests: {str(e)}")

@router.get("/analysis/decomposition", response_model=DecompositionResponse)
def get_decomposition(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    period: int = Query(5, description="Seasonal candidate frequency (e.g. 5 for trading week, 21 for month)"),
    model_type: str = Query("additive", description="'additive' or 'multiplicative'")
):
    try:
        return eda_service.get_decomposition(base, quote, period=period, model_type=model_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate time series decomposition: {str(e)}")

@router.get("/analysis/volatility", response_model=VolatilityResponse)
def get_volatility(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    window: int = Query(21, description="Rolling window size in observation days"),
    annualize: bool = Query(True, description="Whether to scale to annual volatility")
):
    try:
        return eda_service.get_volatility(base, quote, window=window, annualize=annualize)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate volatility series: {str(e)}")

@router.get("/analysis/acf-pacf", response_model=AcfPacfResponse)
def get_acf_pacf(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    lags: int = Query(30, description="Number of autocorrelation lags"),
    differenced: bool = Query(False, description="Compute on first difference")
):
    try:
        return eda_service.get_acf_pacf(base, quote, max_lags=lags, differenced=differenced)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate ACF/PACF: {str(e)}")

