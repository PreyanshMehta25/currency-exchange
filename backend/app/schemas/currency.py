from typing import List, Optional
from pydantic import BaseModel, Field

class CurrencyInfo(BaseModel):
    iso_code: str
    name: str
    symbol: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CurrenciesResponse(BaseModel):
    total: int
    currencies: List[CurrencyInfo]

class ProviderInfo(BaseModel):
    key: str
    name: str
    country_code: Optional[str] = None
    rate_type: Optional[str] = None
    pivot_currency: Optional[str] = None
    data_url: Optional[str] = None
    terms_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    publish_cadence: Optional[str] = None
    frequency: Optional[str] = None
    publishes_missed: Optional[int] = 0
    currencies: List[str] = []

class ProvidersResponse(BaseModel):
    total: int
    providers: List[ProviderInfo]

