export interface CurrencyInfo {
  iso_code: string;
  name: string;
  symbol?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProviderInfo {
  key: string;
  name: string;
  country_code?: string;
  rate_type?: string;
  pivot_currency?: string;
  data_url?: string;
  terms_url?: string | null;
  start_date?: string;
  end_date?: string;
  publish_cadence?: string;
  currencies: string[];
}

export interface RateItem {
  date: string;
  base: string;
  quote: string;
  rate: number;
  data_source?: string;
  is_derived?: boolean;
}

export interface RatesResponse {
  base: string;
  quote: string;
  start_date: string;
  end_date: string;
  count: number;
  data_source: string;
  rates: RateItem[];
}

export interface DataQualityReport {
  base: string;
  quote: string;
  start_date: string;
  end_date: string;
  total_observations: number;
  expected_business_days: number;
  missing_observations: number;
  duplicate_observations: number;
  outlier_count: number;
  mean_rate: number;
  median_rate: number;
  std_rate: number;
  min_rate: number;
  max_rate: number;
  percentage_change: number;
  data_source: string;
  is_cached: boolean;
  last_refresh?: string | null;
  data_quality_flags: string[];
}

export interface SummaryStats {
  mean: number;
  median: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  skewness: number;
  kurtosis: number;
  count: number;
}

export interface DescriptiveStatisticsResponse {
  base: string;
  quote: string;
  start_date: string;
  end_date: string;
  count: number;
  levels_stats: SummaryStats;
  returns_stats: SummaryStats;
  diff_stats: SummaryStats;
}

export interface StationarityTestResult {
  test_name: string;
  null_hypothesis: string;
  test_statistic: number;
  p_value: number;
  critical_values: Record<string, number>;
  lags_used: number;
  is_stationary: boolean;
  interpretation: string;
}

export interface StationarityResponse {
  base: string;
  quote: string;
  series_name: string;
  levels_adf: StationarityTestResult;
  levels_kpss: StationarityTestResult;
  differenced_adf: StationarityTestResult;
  differenced_kpss: StationarityTestResult;
  overall_conclusion: string;
}

export interface DecompositionPoint {
  date: string;
  observed: number;
  trend?: number | null;
  seasonal?: number | null;
  residual?: number | null;
}

export interface DecompositionResponse {
  base: string;
  quote: string;
  model_type: string;
  period: number;
  data: DecompositionPoint[];
  seasonal_variance_ratio: number;
  interpretation: string;
  is_meaningful: boolean;
}

export interface VolatilityPoint {
  date: string;
  volatility: number;
  rolling_mean?: number | null;
}

export interface VolatilityResponse {
  base: string;
  quote: string;
  window: number;
  annualized: boolean;
  series: VolatilityPoint[];
}

export interface AcfPacfLag {
  lag: number;
  acf: number;
  pacf: number;
  conf_upper: number;
  conf_lower: number;
}

export interface AcfPacfResponse {
  base: string;
  quote: string;
  max_lags: number;
  lags: AcfPacfLag[];
  differenced: boolean;
}

export interface ForecastPredictionPoint {
  date: string;
  predicted_rate: number;
  lower_bound?: number | null;
  upper_bound?: number | null;
}

export interface ModelForecastResult {
  model_name: string;
  display_name: string;
  parameters: Record<string, any>;
  training_start: string;
  training_end: string;
  training_observations: number;
  forecast_horizon: number;
  predictions: ForecastPredictionPoint[];
  metrics?: {
    mae: number;
    rmse: number;
    mape: number;
    smape: number;
    directional_accuracy: number;
    n_observations: number;
  } | null;
  fitting_status: "success" | "failed";
  error_message?: string | null;
  multi_step_strategy: string;
  interval_method?: string | null;
}

export interface ForecastResponse {
  run_id: string;
  base: string;
  quote: string;
  horizon: number;
  last_historical_date: string;
  last_historical_rate: number;
  forecast_dates: string[];
  forecasts: Record<string, ModelForecastResult>;
  naive_benchmark?: ModelForecastResult | null;
  created_at: string;
}

export interface ForecastCompareResponse {
  run_id: string;
  base: string;
  quote: string;
  horizon: number;
  historical_rates: { date: string; rate: number }[];
  forecast_dates: string[];
  models: Record<string, ModelForecastResult>;
  naive_benchmark: ModelForecastResult;
  evaluation_metrics: Record<string, Record<string, number | null>>;
  best_models: {
    mae: string;
    rmse: string;
    mape: string;
    directional_accuracy: string;
  };
  created_at: string;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  smape: number;
  directional_accuracy: number;
  n_observations: number;
}

export interface HorizonEvaluationResult {
  horizon: number;
  models: Record<string, ModelMetrics>;
  best_model_by_mae: string;
  best_model_by_rmse: string;
  best_model_by_mape: string;
  best_model_by_da: string;
}

export interface BacktestResponse {
  run_id: string;
  base: string;
  quote: string;
  method: string;
  initial_train_fraction: number;
  horizons_evaluated: number[];
  results_by_horizon: Record<number, HorizonEvaluationResult>;
  naive_benchmark_by_horizon: Record<number, ModelMetrics>;
  created_at: string;
}

export interface ModelRankingItem {
  rank: number;
  model_name: string;
  display_name: string;
  metric_value: number;
  metric_name: string;
  horizon: number;
  currency_pair: string;
}

