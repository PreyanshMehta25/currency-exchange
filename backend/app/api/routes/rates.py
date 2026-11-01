from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import pandas as pd

from ...config import settings
from ...services.frankfurter_service import frankfurter_service
from ...services.data_pipeline import data_pipeline
from ...schemas.rates import (
    RatesResponse, RateItem, LatestRatesResponse,
    DataRefreshRequest, DataQualityReport
)

router = APIRouter(tags=["Rates & Data Pipeline"])

@router.get("/rates/latest", response_model=LatestRatesResponse)
def get_latest_rates(
    base: str = Query("USD", description="Base currency ISO code"),
    quotes: Optional[str] = Query(None, description="Comma-separated quote currency ISO codes")
):
    try:
        quote_list = [q.strip().upper() for q in quotes.split(",")] if quotes else ["INR", "EUR", "GBP", "JPY"]
        res = frankfurter_service.get_latest_rates(base=base.upper(), quotes=quote_list)
        return LatestRatesResponse(
            base=res["base"],
            rates=[RateItem(**item) for item in res["rates"]],
            timestamp=res["timestamp"]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch latest rates: {str(e)}")

@router.get("/rates/history", response_model=RatesResponse)
def get_historical_rates(
    base: str = Query("USD", description="Base currency"),
    quote: str = Query("INR", description="Quote currency"),
    start_date: Optional[str] = Query("2015-01-01", description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    base = base.upper().strip()
    quote = quote.upper().strip()
    if base == quote:
        raise HTTPException(status_code=400, detail="Base and quote currencies cannot be identical.")

    try:
        df, report = data_pipeline.fetch_and_clean(
            base=base,
            quote=quote,
            start_date=start_date or "2015-01-01",
            end_date=end_date
        )
        
        rates_list = [
            RateItem(
                date=row["date"],
                base=row["base_currency"],
                quote=row["quote_currency"],
                rate=float(row["exchange_rate"]),
                data_source=row.get("data_source", "Frankfurter v2"),
                is_derived=bool(row.get("is_derived", False))
            )
            for _, row in df.iterrows()
        ]

        return RatesResponse(
            base=base,
            quote=quote,
            start_date=report.start_date,
            end_date=report.end_date,
            count=len(rates_list),
            data_source=report.data_source,
            rates=rates_list
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving historical rates: {str(e)}")

@router.get("/rates/pairs")
def get_supported_pairs():
    return {
        "recommended_pairs": settings.RECOMMENDED_PAIRS,
        "default_base": "USD",
        "default_quote": "INR"
    }

@router.post("/data/refresh")
def refresh_data(req: DataRefreshRequest):
    try:
        df, report = data_pipeline.fetch_and_clean(
            base=req.base,
            quote=req.quote,
            start_date=req.start_date or "2015-01-01",
            end_date=req.end_date,
            force_refresh=True
        )
        return {
            "status": "success",
            "message": f"Successfully refreshed data for {req.base.upper()}/{req.quote.upper()}",
            "quality_report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data refresh failed: {str(e)}")

@router.get("/data/quality", response_model=DataQualityReport)
def get_data_quality(
    base: str = Query("USD"),
    quote: str = Query("INR"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    try:
        _, report = data_pipeline.fetch_and_clean(
            base=base,
            quote=quote,
            start_date=start_date or "2015-01-01",
            end_date=end_date,
            force_refresh=False
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate data quality report: {str(e)}")

