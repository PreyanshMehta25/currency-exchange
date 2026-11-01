from fastapi import APIRouter, HTTPException
from typing import List
from ...services.frankfurter_service import frankfurter_service
from ...schemas.currency import CurrenciesResponse, CurrencyInfo, ProvidersResponse, ProviderInfo

router = APIRouter(tags=["Currencies & Providers"])

@router.get("/currencies", response_model=CurrenciesResponse)
def get_currencies():
    try:
        currs = frankfurter_service.get_currencies()
        return CurrenciesResponse(
            total=len(currs),
            currencies=[CurrencyInfo(**c) for c in currs]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch currencies from provider: {str(e)}")

@router.get("/providers", response_model=ProvidersResponse)
def get_providers():
    try:
        provs = frankfurter_service.get_providers()
        return ProvidersResponse(
            total=len(provs),
            providers=[ProviderInfo(**p) for p in provs]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch providers: {str(e)}")

