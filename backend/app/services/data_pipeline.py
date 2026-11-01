import logging
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import pandas as pd
import numpy as np

from ..config import settings
from .frankfurter_service import frankfurter_service
from ..utils.date_utils import count_expected_business_days
from ..schemas.rates import DataQualityReport

logger = logging.getLogger(__name__)

class DataPipeline:
    def __init__(self):
        self.processed_dir = settings.PROCESSED_DATA_DIR

    def fetch_and_clean(
        self,
        base: str,
        quote: str,
        start_date: str = "2015-01-01",
        end_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> Tuple[pd.DataFrame, DataQualityReport]:
        """
        Retrieves raw rates, executes data cleaning, generates data quality report,
        and saves standardized processed dataset.
        """
        raw_rates, is_cached, last_refresh = frankfurter_service.get_historical_rates(
            base=base,
            quote=quote,
            start_date=start_date,
            end_date=end_date,
            force_refresh=force_refresh
        )
        
        if not raw_rates:
            raise ValueError(f"No rates available for {base}/{quote}")

        df = pd.DataFrame(raw_rates)
        
        # 1. Standardize column names
        expected_cols = {
            "date": "date",
            "base": "base_currency",
            "quote": "quote_currency",
            "rate": "exchange_rate",
            "data_source": "data_source",
            "is_derived": "is_derived"
        }
        df = df.rename(columns=expected_cols)
        
        if "data_source" not in df.columns:
            df["data_source"] = "Frankfurter v2"
        if "is_derived" not in df.columns:
            df["is_derived"] = False
            
        # 2. Duplicate detection
        initial_count = len(df)
        duplicates_count = int(df.duplicated(subset=["date"]).sum())
        if duplicates_count > 0:
            logger.info(f"Detected {duplicates_count} duplicate dates. Keeping first occurrence.")
            df = df.drop_duplicates(subset=["date"], keep="first")
            
        # 3. Data type validation and filtering non-positive/NaN rates
        df["exchange_rate"] = pd.to_numeric(df["exchange_rate"], errors="coerce")
        df = df.dropna(subset=["exchange_rate", "date"])
        df = df[df["exchange_rate"] > 0]
        
        # 4. Chronological sorting
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        df = df.sort_values(by="date", ascending=True).reset_index(drop=True)
        
        if len(df) == 0:
            raise ValueError("All exchange rate observations were invalid or non-positive.")
            
        actual_start_date = df["date"].iloc[0]
        actual_end_date = df["date"].iloc[-1]
        
        # 5. Outlier detection using IQR
        q25 = df["exchange_rate"].quantile(0.25)
        q75 = df["exchange_rate"].quantile(0.75)
        iqr = q75 - q25
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        
        df["is_outlier"] = (df["exchange_rate"] < lower_bound) | (df["exchange_rate"] > upper_bound)
        outlier_count = int(df["is_outlier"].sum())
        
        # 6. Missing business days calculation
        expected_b_days = count_expected_business_days(actual_start_date, actual_end_date)
        actual_obs = len(df)
        # Note: Central banks / providers publish on business days excluding local holidays.
        # Missing observations = max(0, expected_b_days - actual_obs)
        missing_obs = max(0, expected_b_days - actual_obs)
        
        # 7. Quality flags
        flags = []
        if duplicates_count > 0:
            flags.append(f"{duplicates_count} duplicate dates resolved.")
        if outlier_count > 0:
            flags.append(f"{outlier_count} statistical outlier(s) detected (IQR 1.5x) - retained to preserve market reality.")
        if missing_obs > expected_b_days * 0.15:
            flags.append(f"Significant missing observations ({missing_obs}) vs typical calendar business days (may include local bank holidays).")
        if df["is_derived"].any():
            flags.append("Cross-rate mathematically derived via EUR anchor.")
            
        first_val = float(df["exchange_rate"].iloc[0])
        last_val = float(df["exchange_rate"].iloc[-1])
        pct_change = round(((last_val - first_val) / first_val) * 100.0, 2)
        
        quality_report = DataQualityReport(
            base=base.upper(),
            quote=quote.upper(),
            start_date=actual_start_date,
            end_date=actual_end_date,
            total_observations=actual_obs,
            expected_business_days=expected_b_days,
            missing_observations=missing_obs,
            duplicate_observations=duplicates_count,
            outlier_count=outlier_count,
            mean_rate=round(float(df["exchange_rate"].mean()), 5),
            median_rate=round(float(df["exchange_rate"].median()), 5),
            std_rate=round(float(df["exchange_rate"].std()), 5),
            min_rate=round(float(df["exchange_rate"].min()), 5),
            max_rate=round(float(df["exchange_rate"].max()), 5),
            percentage_change=pct_change,
            data_source=str(df["data_source"].iloc[0]),
            is_cached=is_cached,
            last_refresh=last_refresh,
            data_quality_flags=flags
        )
        
        # Save processed dataset to CSV
        processed_file = self.processed_dir / f"{base.upper()}_{quote.upper()}_processed.csv"
        df.to_csv(processed_file, index=False)
        
        return df, quality_report

    def get_processed_dataframe(
        self,
        base: str,
        quote: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """Loads processed dataframe or triggers pipeline if missing or insufficient."""
        from datetime import datetime
        base = base.upper().strip()
        quote = quote.upper().strip()
        processed_file = self.processed_dir / f"{base}_{quote}_processed.csv"
        
        req_start = start_date or "2015-01-01"
        req_end = end_date or datetime.utcnow().strftime("%Y-%m-%d")
        
        need_fetch = True
        if processed_file.exists():
            try:
                df = pd.read_csv(processed_file)
                if len(df) > 0:
                    first_d = str(df["date"].iloc[0])
                    last_d = str(df["date"].iloc[-1])
                    if first_d <= req_start and last_d >= req_end:
                        need_fetch = False
            except Exception:
                need_fetch = True

        if need_fetch:
            df, _ = self.fetch_and_clean(base, quote, start_date=req_start, end_date=end_date)
            
        if start_date:
            df = df[df["date"] >= start_date]
        if end_date:
            df = df[df["date"] <= end_date]
            
        return df.reset_index(drop=True)

data_pipeline = DataPipeline()
