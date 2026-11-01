import time
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime, timedelta
import httpx
import pandas as pd

from ..config import settings
from ..utils.storage import save_cache_metadata, get_cache_metadata

logger = logging.getLogger(__name__)

class FrankfurterService:
    def __init__(self):
        self.base_url = settings.FRANKFURTER_BASE_URL
        self.timeout = settings.REQUEST_TIMEOUT_SECONDS
        self.max_retries = settings.MAX_RETRIES
        self.backoff_factor = settings.RETRY_BACKOFF_FACTOR
        self.raw_dir = settings.RAW_DATA_DIR
        self.cache_dir = settings.CACHE_DATA_DIR
        self.headers = {"User-Agent": "FX-Insight/1.0 (Academic Research; Python/httpx)"}

    def _get_with_retry(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        retries = 0
        last_error = None
        
        while retries <= self.max_retries:
            try:
                with httpx.Client(timeout=self.timeout, headers=self.headers) as client:
                    response = client.get(url, params=params)
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code in (429, 500, 502, 503, 504):
                        logger.warning(f"HTTP {response.status_code} for {url}. Retrying...")
                    else:
                        response.raise_for_status()
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                last_error = e
                logger.warning(f"Request failed ({e}) on attempt {retries + 1}/{self.max_retries + 1}")
            
            retries += 1
            if retries <= self.max_retries:
                sleep_time = self.backoff_factor ** retries
                time.sleep(sleep_time)
                
        raise RuntimeError(f"Frankfurter API request failed for {url} after {self.max_retries} retries: {last_error}")

    def get_currencies(self) -> List[Dict[str, Any]]:
        cache_key = "frankfurter_currencies"
        cached = get_cache_metadata(cache_key)
        
        # Cache currencies for 24 hours
        if cached:
            cached_time = datetime.fromisoformat(cached["updated_at"])
            if datetime.utcnow() - cached_time < timedelta(hours=settings.DEFAULT_CACHE_HOURS):
                return cached["value"]
                
        try:
            data = self._get_with_retry("/v2/currencies")
            currencies = []
            if isinstance(data, list):
                for item in data:
                    currencies.append({
                        "iso_code": item.get("iso_code") or item.get("code") or "",
                        "name": item.get("name") or "",
                        "symbol": item.get("symbol"),
                        "start_date": item.get("start_date"),
                        "end_date": item.get("end_date")
                    })
            elif isinstance(data, dict):
                for code, name in data.items():
                    currencies.append({
                        "iso_code": code,
                        "name": name if isinstance(name, str) else name.get("name", code),
                        "symbol": None,
                        "start_date": None,
                        "end_date": None
                    })
            
            currencies.sort(key=lambda x: x["iso_code"])
            save_cache_metadata(cache_key, currencies)
            return currencies
        except Exception as e:
            logger.error(f"Failed to fetch currencies from API: {e}")
            if cached:
                logger.info("Falling back to cached currencies metadata.")
                return cached["value"]
            raise e

    def get_providers(self) -> List[Dict[str, Any]]:
        cache_key = "frankfurter_providers"
        cached = get_cache_metadata(cache_key)
        if cached:
            cached_time = datetime.fromisoformat(cached["updated_at"])
            if datetime.utcnow() - cached_time < timedelta(hours=settings.DEFAULT_CACHE_HOURS):
                return cached["value"]
                
        try:
            data = self._get_with_retry("/v2/providers")
            providers = []
            if isinstance(data, list):
                for p in data:
                    providers.append({
                        "key": p.get("key", ""),
                        "name": p.get("name", ""),
                        "country_code": p.get("country_code"),
                        "rate_type": p.get("rate_type"),
                        "pivot_currency": p.get("pivot_currency"),
                        "data_url": p.get("data_url"),
                        "terms_url": p.get("terms_url"),
                        "start_date": p.get("start_date"),
                        "end_date": p.get("end_date"),
                        "publish_cadence": p.get("publish_cadence"),
                        "frequency": p.get("frequency"),
                        "publishes_missed": p.get("publishes_missed", 0),
                        "currencies": p.get("currencies", [])
                    })
            save_cache_metadata(cache_key, providers)
            return providers
        except Exception as e:
            logger.error(f"Failed to fetch providers: {e}")
            if cached:
                return cached["value"]
            return []

    def get_latest_rates(self, base: str = "USD", quotes: Optional[List[str]] = None) -> Dict[str, Any]:
        params = {"base": base.upper()}
        if quotes:
            params["quotes"] = ",".join([q.upper() for q in quotes])
            
        try:
            data = self._get_with_retry("/v2/rates", params=params)
            rates_list = []
            if isinstance(data, list):
                for item in data:
                    rates_list.append({
                        "date": item.get("date"),
                        "base": item.get("base"),
                        "quote": item.get("quote"),
                        "rate": float(item.get("rate")),
                        "data_source": "Frankfurter v2",
                        "is_derived": False
                    })
            elif isinstance(data, dict):
                date_val = data.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
                rates_dict = data.get("rates", {})
                for q, r in rates_dict.items():
                    rates_list.append({
                        "date": date_val,
                        "base": base.upper(),
                        "quote": q.upper(),
                        "rate": float(r),
                        "data_source": "Frankfurter v2",
                        "is_derived": False
                    })
            return {
                "base": base.upper(),
                "rates": rates_list,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error fetching latest rates for base={base}: {e}")
            # Try single rate lookup or cross rate
            raise e

    def get_historical_rates(
        self,
        base: str,
        quote: str,
        start_date: str,
        end_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> Tuple[List[Dict[str, Any]], bool, str]:
        """
        Retrieves historical rates. Returns (rates, is_cached, last_refresh_iso).
        Caches raw JSON response in backend/data/raw/{base}_{quote}_{start}_{end}.json.
        """
        base = base.upper().strip()
        quote = quote.upper().strip()
        if base == quote:
            raise ValueError("Base and quote currencies cannot be identical.")
            
        if end_date is None:
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
            
        cache_file = self.cache_dir / f"{base}_{quote}_history.json"
        
        # Check cache if not force_refresh
        if not force_refresh and cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                
                cached_time = datetime.fromisoformat(cached_data.get("cached_at", "2000-01-01T00:00:00"))
                cached_rates = cached_data.get("rates", [])
                
                # If cached within 12 hours and covers the date range requested
                if cached_rates and (datetime.utcnow() - cached_time < timedelta(hours=12)):
                    first_date = cached_rates[0]["date"]
                    last_date = cached_rates[-1]["date"]
                    if first_date <= start_date and last_date >= end_date:
                        # Filter to requested range
                        filtered = [r for r in cached_rates if start_date <= r["date"] <= end_date]
                        if filtered:
                            return filtered, True, cached_data.get("cached_at")
            except Exception as e:
                logger.warning(f"Error reading local cache: {e}. Will fetch fresh data.")

        # Attempt direct fetch
        params = {
            "base": base,
            "quotes": quote,
            "from": start_date,
            "to": end_date
        }
        
        rates_result = []
        is_derived = False
        
        try:
            data = self._get_with_retry("/v2/rates", params=params)
            if isinstance(data, list):
                for item in data:
                    rates_result.append({
                        "date": item.get("date"),
                        "base": item.get("base", base),
                        "quote": item.get("quote", quote),
                        "rate": float(item.get("rate")),
                        "data_source": "Frankfurter v2",
                        "is_derived": False
                    })
            elif isinstance(data, dict) and "rates" in data:
                rates_dict = data.get("rates", {})
                for d_str, q_dict in sorted(rates_dict.items()):
                    if quote in q_dict:
                        rates_result.append({
                            "date": d_str,
                            "base": base,
                            "quote": quote,
                            "rate": float(q_dict[quote]),
                            "data_source": "Frankfurter v2",
                            "is_derived": False
                        })
        except Exception as direct_err:
            logger.warning(f"Direct rate fetch for {base}/{quote} failed: {direct_err}. Attempting cross-rate derivation via EUR.")
            # Cross-rate derivation:
            # rate(base->quote) = rate(EUR->quote) / rate(EUR->base)
            try:
                eur_base_data = self._get_with_retry("/v2/rates", params={"base": "EUR", "quotes": base, "from": start_date, "to": end_date})
                eur_quote_data = self._get_with_retry("/v2/rates", params={"base": "EUR", "quotes": quote, "from": start_date, "to": end_date})
                
                base_map = {item["date"]: float(item["rate"]) for item in eur_base_data if item.get("quote") == base}
                quote_map = {item["date"]: float(item["rate"]) for item in eur_quote_data if item.get("quote") == quote}
                
                common_dates = sorted(set(base_map.keys()).intersection(set(quote_map.keys())))
                for d in common_dates:
                    b_val = base_map[d]
                    q_val = quote_map[d]
                    if b_val > 0:
                        rates_result.append({
                            "date": d,
                            "base": base,
                            "quote": quote,
                            "rate": round(q_val / b_val, 6),
                            "data_source": "Frankfurter v2 (EUR Cross-Derived)",
                            "is_derived": True
                        })
                is_derived = True
            except Exception as cross_err:
                logger.error(f"Cross-rate derivation also failed: {cross_err}")
                # Fall back to any local cache even if stale
                if cache_file.exists():
                    try:
                        with open(cache_file, "r", encoding="utf-8") as f:
                            cached_data = json.load(f)
                        filtered = [r for r in cached_data.get("rates", []) if start_date <= r["date"] <= end_date]
                        if filtered:
                            logger.info("Serving stale cached data due to API failure.")
                            return filtered, True, cached_data.get("cached_at")
                    except Exception:
                        pass
                raise RuntimeError(f"Unable to retrieve exchange rates for {base}/{quote}: {direct_err}")

        if not rates_result:
            # Fall back to stale cache if available
            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                return cached_data.get("rates", []), True, cached_data.get("cached_at")
            raise ValueError(f"No exchange rate data returned for {base}/{quote} from {start_date} to {end_date}.")

        # Save raw and cache
        now_iso = datetime.utcnow().isoformat()
        cache_payload = {
            "base": base,
            "quote": quote,
            "start_date": start_date,
            "end_date": end_date,
            "is_derived": is_derived,
            "cached_at": now_iso,
            "rates": rates_result
        }
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cache_payload, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to write cache file: {e}")

        return rates_result, False, now_iso

frankfurter_service = FrankfurterService()

