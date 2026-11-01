from datetime import datetime, timedelta
from typing import List
import pandas as pd

def parse_date(date_str: str) -> datetime:
    """Parses an ISO format date string (YYYY-MM-DD)."""
    return datetime.strptime(date_str, "%Y-%m-%d")

def format_date(dt: datetime) -> str:
    """Formats datetime to YYYY-MM-DD."""
    return dt.strftime("%Y-%m-%d")

def generate_future_business_dates(last_date_str: str, horizon: int) -> List[str]:
    """
    Generates the next `horizon` business days (Monday-Friday) after `last_date_str`.
    Exchange rates publish on business days.
    """
    current_dt = parse_date(last_date_str)
    future_dates = []
    
    while len(future_dates) < horizon:
        current_dt += timedelta(days=1)
        # 0 = Monday, 4 = Friday, 5 = Saturday, 6 = Sunday
        if current_dt.weekday() < 5:
            future_dates.append(format_date(current_dt))
            
    return future_dates

def count_expected_business_days(start_date_str: str, end_date_str: str) -> int:
    """Counts expected Monday-Friday dates in range [start_date, end_date]."""
    start_dt = parse_date(start_date_str)
    end_dt = parse_date(end_date_str)
    if start_dt > end_dt:
        return 0
    bdate_range = pd.bdate_range(start=start_dt, end=end_dt)
    return len(bdate_range)

