import axios from "axios";
import {
  CurrencyInfo,
  ProviderInfo,
  RatesResponse,
  RateItem,
  DataQualityReport,
  DescriptiveStatisticsResponse,
  StationarityResponse,
  DecompositionResponse,
  VolatilityResponse,
  AcfPacfResponse,
  ForecastResponse,
  ForecastCompareResponse,
  BacktestResponse,
  ModelRankingItem,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = {
  // System
  getHealth: async () => {
    const res = await apiClient.get("/health");
    return res.data;
  },

  getMetadata: async () => {
    const res = await apiClient.get("/metadata");
    return res.data;
  },

  // Currencies & Providers
  getCurrencies: async (): Promise<CurrencyInfo[]> => {
    const res = await apiClient.get<{ total: number; currencies: CurrencyInfo[] }>("/currencies");
    return res.data.currencies;
  },

  getProviders: async (): Promise<ProviderInfo[]> => {
    const res = await apiClient.get<{ total: number; providers: ProviderInfo[] }>("/providers");
    return res.data.providers;
  },

  getSupportedPairs: async (): Promise<{ recommended_pairs: string[]; default_base: string; default_quote: string }> => {
    const res = await apiClient.get("/rates/pairs");
    return res.data;
  },

  // Rates & Data Pipeline
  getLatestRates: async (base: string = "USD", quotes?: string[]): Promise<RateItem[]> => {
    const quotesParam = quotes ? quotes.join(",") : undefined;
    const res = await apiClient.get<{ base: string; rates: RateItem[] }>("/rates/latest", {
      params: { base, quotes: quotesParam },
    });
    return res.data.rates;
  },

  getHistoricalRates: async (
    base: string,
    quote: string,
    startDate?: string,
    endDate?: string
  ): Promise<RatesResponse> => {
    const res = await apiClient.get<RatesResponse>("/rates/history", {
      params: { base, quote, start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  getDataQuality: async (
    base: string,
    quote: string,
    startDate?: string,
    endDate?: string
  ): Promise<DataQualityReport> => {
    const res = await apiClient.get<DataQualityReport>("/data/quality", {
      params: { base, quote, start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  refreshData: async (base: string, quote: string, startDate?: string, endDate?: string) => {
    const res = await apiClient.post("/data/refresh", {
      base,
      quote,
      start_date: startDate,
      end_date: endDate,
      force_refresh: true,
    });
    return res.data;
  },

  // EDA
  getStatistics: async (
    base: string,
    quote: string,
    startDate?: string,
    endDate?: string
  ): Promise<DescriptiveStatisticsResponse> => {
    const res = await apiClient.get<DescriptiveStatisticsResponse>("/analysis/statistics", {
      params: { base, quote, start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  getStationarity: async (
    base: string,
    quote: string,
    startDate?: string,
    endDate?: string
  ): Promise<StationarityResponse> => {
    const res = await apiClient.get<StationarityResponse>("/analysis/stationarity", {
      params: { base, quote, start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  getDecomposition: async (
    base: string,
    quote: string,
    period: number = 5,
    modelType: string = "additive"
  ): Promise<DecompositionResponse> => {
    const res = await apiClient.get<DecompositionResponse>("/analysis/decomposition", {
      params: { base, quote, period, model_type: modelType },
    });
    return res.data;
  },

  getVolatility: async (
    base: string,
    quote: string,
    window: number = 21,
    annualize: boolean = true
  ): Promise<VolatilityResponse> => {
    const res = await apiClient.get<VolatilityResponse>("/analysis/volatility", {
      params: { base, quote, window, annualize },
    });
    return res.data;
  },

  getAcfPacf: async (
    base: string,
    quote: string,
    lags: number = 30,
    differenced: boolean = false
  ): Promise<AcfPacfResponse> => {
    const res = await apiClient.get<AcfPacfResponse>("/analysis/acf-pacf", {
      params: { base, quote, lags, differenced },
    });
    return res.data;
  },

  // Forecasting
  runForecast: async (
    base: string,
    quote: string,
    horizon: number = 7,
    models: string[] = ["linear_regression", "arima", "sarima", "holt", "random_forest"],
    startDate?: string,
    endDate?: string
  ): Promise<ForecastResponse> => {
    const res = await apiClient.post<ForecastResponse>("/forecast", {
      base,
      quote,
      horizon,
      models,
      start_date: startDate,
      end_date: endDate,
    });
    return res.data;
  },

  compareForecasts: async (
    base: string,
    quote: string,
    horizon: number = 7,
    startDate?: string,
    endDate?: string
  ): Promise<ForecastCompareResponse> => {
    const res = await apiClient.post<ForecastCompareResponse>("/forecast/compare", {
      base,
      quote,
      horizon,
      start_date: startDate,
      end_date: endDate,
    });
    return res.data;
  },

  getForecastHistory: async (limit: number = 20) => {
    const res = await apiClient.get("/forecast/history", { params: { limit } });
    return res.data;
  },

  // Evaluation & Backtesting
  runBacktest: async (
    base: string,
    quote: string,
    horizons: number[] = [7, 15, 30],
    models: string[] = ["linear_regression", "arima", "sarima", "holt", "random_forest"],
    method: string = "expanding",
    initialTrainFraction: number = 0.7,
    stepStride: number = 15
  ): Promise<BacktestResponse> => {
    const res = await apiClient.post<BacktestResponse>("/evaluation/backtest", {
      base,
      quote,
      horizons,
      models,
      method,
      initial_train_fraction: initialTrainFraction,
      step_stride: stepStride,
    });
    return res.data;
  },

  getRankings: async (
    base: string = "USD",
    quote: string = "INR",
    metric: string = "mae",
    horizon: number = 7
  ): Promise<ModelRankingItem[]> => {
    const res = await apiClient.get<{ metric: string; horizon: number; rankings: ModelRankingItem[] }>(
      "/evaluation/rankings",
      {
        params: { base, quote, metric, horizon },
      }
    );
    return res.data.rankings;
  },
};

export default apiClient;

