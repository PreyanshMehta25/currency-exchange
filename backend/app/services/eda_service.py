import logging
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import adfuller, kpss, acf, pacf
from statsmodels.tsa.seasonal import seasonal_decompose

from .data_pipeline import data_pipeline
from ..schemas.analysis import (
    SummaryStats, DescriptiveStatisticsResponse, StationarityTestResult,
    StationarityResponse, DecompositionPoint, DecompositionResponse,
    VolatilityPoint, VolatilityResponse, AcfPacfLag, AcfPacfResponse
)

logger = logging.getLogger(__name__)

class EdaService:
    @staticmethod
    def _calc_summary(series: pd.Series) -> SummaryStats:
        clean = series.dropna()
        if len(clean) == 0:
            return SummaryStats(
                mean=0.0, median=0.0, std=0.0, variance=0.0,
                min=0.0, max=0.0, range=0.0, skewness=0.0, kurtosis=0.0, count=0
            )
        mean_val = float(clean.mean())
        median_val = float(clean.median())
        std_val = float(clean.std())
        var_val = float(clean.var())
        min_val = float(clean.min())
        max_val = float(clean.max())
        range_val = max_val - min_val
        skew_val = float(stats.skew(clean, nan_policy="omit"))
        kurt_val = float(stats.kurtosis(clean, nan_policy="omit"))
        
        return SummaryStats(
            mean=round(mean_val, 5),
            median=round(median_val, 5),
            std=round(std_val, 5),
            variance=round(var_val, 6),
            min=round(min_val, 5),
            max=round(max_val, 5),
            range=round(range_val, 5),
            skewness=round(skew_val, 4),
            kurtosis=round(kurt_val, 4),
            count=len(clean)
        )

    def get_descriptive_statistics(
        self,
        base: str,
        quote: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> DescriptiveStatisticsResponse:
        df = data_pipeline.get_processed_dataframe(base, quote, start_date, end_date)
        levels = df["exchange_rate"]
        returns = levels.pct_change() * 100.0
        diffs = levels.diff()
        
        return DescriptiveStatisticsResponse(
            base=base.upper(),
            quote=quote.upper(),
            start_date=df["date"].iloc[0],
            end_date=df["date"].iloc[-1],
            count=len(df),
            levels_stats=self._calc_summary(levels),
            returns_stats=self._calc_summary(returns),
            diff_stats=self._calc_summary(diffs)
        )

    def get_stationarity_tests(
        self,
        base: str,
        quote: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> StationarityResponse:
        df = data_pipeline.get_processed_dataframe(base, quote, start_date, end_date)
        levels = df["exchange_rate"].dropna().values
        diffs = np.diff(levels)
        
        # 1. ADF on Levels
        adf_levels = adfuller(levels, autolag="AIC")
        adf_levels_stat, adf_levels_p, adf_levels_lags, _, adf_levels_crit, _ = adf_levels
        adf_levels_stat_res = StationarityTestResult(
            test_name="Augmented Dickey-Fuller (ADF) - Levels",
            null_hypothesis="The series contains a unit root (Non-Stationary)",
            test_statistic=round(float(adf_levels_stat), 4),
            p_value=round(float(adf_levels_p), 5),
            critical_values={k: round(float(v), 4) for k, v in adf_levels_crit.items()},
            lags_used=int(adf_levels_lags),
            is_stationary=bool(adf_levels_p < 0.05),
            interpretation="Reject null: Series is stationary" if adf_levels_p < 0.05 else "Fail to reject null: Series has a unit root (Non-Stationary)"
        )
        
        # 2. KPSS on Levels
        # regression='c' is level stationarity
        kpss_levels = kpss(levels, regression="c", nlags="auto")
        kpss_levels_stat, kpss_levels_p, kpss_levels_lags, kpss_levels_crit = kpss_levels
        kpss_levels_stat_res = StationarityTestResult(
            test_name="KPSS Test - Levels",
            null_hypothesis="The series is level stationary (Stationary)",
            test_statistic=round(float(kpss_levels_stat), 4),
            p_value=round(float(kpss_levels_p), 5),
            critical_values={k: round(float(v), 4) for k, v in kpss_levels_crit.items()},
            lags_used=int(kpss_levels_lags),
            is_stationary=bool(kpss_levels_p >= 0.05),
            interpretation="Fail to reject null: Series is stationary" if kpss_levels_p >= 0.05 else "Reject null: Series is NOT stationary"
        )
        
        # 3. ADF on Differenced series
        adf_diff = adfuller(diffs, autolag="AIC")
        adf_diff_stat, adf_diff_p, adf_diff_lags, _, adf_diff_crit, _ = adf_diff
        adf_diff_stat_res = StationarityTestResult(
            test_name="Augmented Dickey-Fuller (ADF) - 1st Difference",
            null_hypothesis="The 1st-differenced series contains a unit root (Non-Stationary)",
            test_statistic=round(float(adf_diff_stat), 4),
            p_value=round(float(adf_diff_p), 5),
            critical_values={k: round(float(v), 4) for k, v in adf_diff_crit.items()},
            lags_used=int(adf_diff_lags),
            is_stationary=bool(adf_diff_p < 0.05),
            interpretation="Reject null: First difference is stationary (I(1) confirmed)" if adf_diff_p < 0.05 else "Fail to reject null: First difference is non-stationary"
        )
        
        # 4. KPSS on Differenced series
        kpss_diff = kpss(diffs, regression="c", nlags="auto")
        kpss_diff_stat, kpss_diff_p, kpss_diff_lags, kpss_diff_crit = kpss_diff
        kpss_diff_stat_res = StationarityTestResult(
            test_name="KPSS Test - 1st Difference",
            null_hypothesis="The 1st-differenced series is stationary (Stationary)",
            test_statistic=round(float(kpss_diff_stat), 4),
            p_value=round(float(kpss_diff_p), 5),
            critical_values={k: round(float(v), 4) for k, v in kpss_diff_crit.items()},
            lags_used=int(kpss_diff_lags),
            is_stationary=bool(kpss_diff_p >= 0.05),
            interpretation="Fail to reject null: First difference is stationary" if kpss_diff_p >= 0.05 else "Reject null: First difference has residual non-stationarity"
        )
        
        # Overall conclusion
        if not adf_levels_stat_res.is_stationary and adf_diff_stat_res.is_stationary:
            conclusion = (
                f"The raw exchange rate level for {base}/{quote} is non-stationary with a unit root (p={adf_levels_p:.4f}), "
                f"while the first-differenced series is stationary (p={adf_diff_p:.4f}). This confirms the exchange rate is integrated of order 1, I(1)."
            )
        elif adf_levels_stat_res.is_stationary:
            conclusion = f"Surprisingly, the raw level for {base}/{quote} appears stationary according to ADF (p={adf_levels_p:.4f})."
        else:
            conclusion = f"The series exhibits non-stationarity across tests."

        return StationarityResponse(
            base=base.upper(),
            quote=quote.upper(),
            series_name=f"{base}/{quote} Daily Exchange Rate",
            levels_adf=adf_levels_stat_res,
            levels_kpss=kpss_levels_stat_res,
            differenced_adf=adf_diff_stat_res,
            differenced_kpss=kpss_diff_stat_res,
            overall_conclusion=conclusion
        )

    def get_decomposition(
        self,
        base: str,
        quote: str,
        period: int = 5,
        model_type: str = "additive"
    ) -> DecompositionResponse:
        df = data_pipeline.get_processed_dataframe(base, quote)
        series = df.set_index("date")["exchange_rate"]
        
        if len(series) < period * 2:
            raise ValueError(f"Insufficient observations ({len(series)}) for decomposition period {period}.")
            
        decomp = seasonal_decompose(series, model=model_type, period=period, extrapolate_trend="freq")
        
        data_points = []
        for d, obs, tr, seas, resid in zip(
            df["date"], decomp.observed, decomp.trend, decomp.seasonal, decomp.resid
        ):
            data_points.append(DecompositionPoint(
                date=d,
                observed=round(float(obs), 5),
                trend=round(float(tr), 5) if pd.notnull(tr) else None,
                seasonal=round(float(seas), 5) if pd.notnull(seas) else None,
                residual=round(float(resid), 5) if pd.notnull(resid) else None
            ))
            
        # Statistical relevance of seasonality: seasonal variance ratio
        # Var(seasonal) / Var(observed - trend)
        detrended = decomp.observed - decomp.trend
        var_detrended = np.nanvar(detrended)
        var_seasonal = np.nanvar(decomp.seasonal)
        
        seasonal_ratio = float(var_seasonal / var_detrended) if var_detrended > 0 else 0.0
        is_meaningful = seasonal_ratio > 0.10
        
        if is_meaningful:
            interpretation = (
                f"A repeating seasonal cycle explaining {seasonal_ratio * 100:.1f}% of detrended variance was detected "
                f"at candidate period={period}."
            )
        else:
            interpretation = (
                f"The seasonal component explains only {seasonal_ratio * 100:.1f}% of detrended variance at period={period}. "
                f"Exchange rates follow random walk/martingale dynamics where fixed calendar seasonality is typically negligible."
            )

        return DecompositionResponse(
            base=base.upper(),
            quote=quote.upper(),
            model_type=model_type,
            period=period,
            data=data_points,
            seasonal_variance_ratio=round(seasonal_ratio, 4),
            interpretation=interpretation,
            is_meaningful=is_meaningful
        )

    def get_volatility(
        self,
        base: str,
        quote: str,
        window: int = 21,
        annualize: bool = True
    ) -> VolatilityResponse:
        df = data_pipeline.get_processed_dataframe(base, quote)
        returns = df["exchange_rate"].pct_change() * 100.0
        
        # Rolling standard deviation
        annualization_factor = np.sqrt(252) if annualize else 1.0
        rolling_std = returns.rolling(window=window).std() * annualization_factor
        rolling_mean = df["exchange_rate"].rolling(window=window).mean()
        
        vol_points = []
        for d, v, m in zip(df["date"], rolling_std, rolling_mean):
            if pd.notnull(v):
                vol_points.append(VolatilityPoint(
                    date=d,
                    volatility=round(float(v), 4),
                    rolling_mean=round(float(m), 4) if pd.notnull(m) else None
                ))
                
        return VolatilityResponse(
            base=base.upper(),
            quote=quote.upper(),
            window=window,
            annualized=annualize,
            series=vol_points
        )

    def get_acf_pacf(
        self,
        base: str,
        quote: str,
        max_lags: int = 40,
        differenced: bool = False
    ) -> AcfPacfResponse:
        df = data_pipeline.get_processed_dataframe(base, quote)
        series = df["exchange_rate"].values
        if differenced:
            series = np.diff(series)
            
        n = len(series)
        actual_lags = min(max_lags, n // 3)
        
        acf_vals = acf(series, nlags=actual_lags, fft=True)
        pacf_vals = pacf(series, nlags=actual_lags, method="yule_walker")
        
        # 95% confidence interval for white noise: +/- 1.96 / sqrt(N)
        conf_band = 1.96 / np.sqrt(n)
        
        lag_results = []
        for lag in range(1, actual_lags + 1):
            lag_results.append(AcfPacfLag(
                lag=lag,
                acf=round(float(acf_vals[lag]), 4),
                pacf=round(float(pacf_vals[lag]), 4),
                conf_upper=round(float(conf_band), 4),
                conf_lower=round(float(-conf_band), 4)
            ))
            
        return AcfPacfResponse(
            base=base.upper(),
            quote=quote.upper(),
            max_lags=actual_lags,
            lags=lag_results,
            differenced=differenced
        )

eda_service = EdaService()

