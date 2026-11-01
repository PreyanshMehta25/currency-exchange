import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { MetricCard } from "../components/MetricCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { RateItem, ForecastResponse, ModelRankingItem } from "../types";
import {
  TrendingUp,
  Activity,
  Award,
  Database,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

export const OverviewPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [bestModel, setBestModel] = useState<string>("Linear Regression");
  const [bestModelMae, setBestModelMae] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>("90D");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const histPromise = api.getHistoricalRates(base, quote, "2020-01-01");
        const fcPromise = api.runForecast(base, quote, 7, [
          "linear_regression",
          "arima",
          "sarima",
          "holt",
          "random_forest",
        ]);
        const rankPromise = api.getRankings(base, quote, "mae", 7).catch(() => []);

        const [histRes, fcRes, rankRes] = await Promise.all([
          histPromise,
          fcPromise,
          rankPromise,
        ]);

        setRates(histRes.rates);
        setForecastData(fcRes);

        if (rankRes && rankRes.length > 0) {
          setBestModel(rankRes[0].display_name);
          setBestModelMae(rankRes[0].metric_value);
        } else {
          setBestModel("ARIMA");
          setBestModelMae(null);
        }
      } catch (err: any) {
        console.error("Overview fetch error:", err);
        setError(err.message || "Failed to load exchange rate overview data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [base, quote]);

  // Derived metrics
  const latestRate = rates.length > 0 ? rates[rates.length - 1].rate : 0;
  const prevRate = rates.length > 1 ? rates[rates.length - 2].rate : latestRate;
  const lastDate = rates.length > 0 ? rates[rates.length - 1].date : "N/A";
  const pctChange = prevRate !== 0 ? ((latestRate - prevRate) / prevRate) * 100 : 0;

  // Filter historical data by timeRange
  const filteredRates = React.useMemo(() => {
    if (!rates.length) return [];
    if (timeRange === "30D") return rates.slice(-30);
    if (timeRange === "90D") return rates.slice(-90);
    if (timeRange === "1Y") return rates.slice(-252);
    if (timeRange === "5Y") return rates.slice(-1260);
    return rates;
  }, [rates, timeRange]);

  // 30-day annualized volatility
  const volatility30d = React.useMemo(() => {
    if (rates.length < 30) return 0;
    const slice = rates.slice(-30);
    const returns = [];
    for (let i = 1; i < slice.length; i++) {
      returns.push((slice[i].rate - slice[i - 1].rate) / slice[i - 1].rate);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }, [rates]);

  // Build forecast chart data (Last 15 historical + 7 forecasted days)
  const combinedForecastChartData = React.useMemo(() => {
    if (!rates.length || !forecastData) return [];
    const histTail = rates.slice(-15).map((r) => ({
      date: r.date,
      historical: r.rate,
      linear_regression: undefined,
      arima: undefined,
      holt: undefined,
      random_forest: undefined,
      naive_benchmark: undefined,
    }));

    // Future points
    const futurePoints = forecastData.forecast_dates.map((d, idx) => ({
      date: d,
      historical: undefined,
      linear_regression: forecastData.forecasts?.linear_regression?.predictions[idx]?.predicted_rate,
      arima: forecastData.forecasts?.arima?.predictions[idx]?.predicted_rate,
      holt: forecastData.forecasts?.holt?.predictions[idx]?.predicted_rate,
      random_forest: forecastData.forecasts?.random_forest?.predictions[idx]?.predicted_rate,
      naive_benchmark: forecastData.naive_benchmark?.predictions[idx]?.predicted_rate,
    }));

    return [...histTail, ...futurePoints];
  }, [rates, forecastData]);

  if (loading) {
    return <LoadingSpinner message="Retrieving real-time market data from Frankfurter v2..." />;
  }

  if (error) {
    return (
      <div className="bg-rose-950/30 border border-rose-800 rounded-lg p-6 text-center space-y-3">
        <p className="text-rose-400 font-mono text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 bg-rose-900 hover:bg-rose-800 text-xs font-mono text-white rounded"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pair Switcher */}
      <CurrencySelector
        base={base}
        quote={quote}
        onBaseChange={setBase}
        onQuoteChange={setQuote}
        currencies={currencies}
        recommendedPairs={recommendedPairs}
      />

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`${base}/${quote} Reference Rate`}
          value={latestRate.toFixed(4)}
          subtext={`As of ${lastDate}`}
          trend={pctChange >= 0 ? "up" : "down"}
          trendValue={`${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(3)}%`}
          icon={TrendingUp}
        />
        <MetricCard
          label="30-Day Annualized Volatility"
          value={`${volatility30d.toFixed(2)}%`}
          subtext="Standard deviation of returns * sqrt(252)"
          icon={Activity}
          badge="Market Risk"
        />
        <MetricCard
          label="Top Performing Model"
          value={bestModel}
          subtext={bestModelMae ? `MAE: ${bestModelMae.toFixed(4)}` : "Evaluated on rolling origin"}
          icon={Award}
          badge="Lowest MAE"
        />
        <MetricCard
          label="Dataset Observations"
          value={rates.length.toLocaleString()}
          subtext="Chronologically validated business days"
          icon={Database}
        />
      </div>

      {/* Historical Exchange Rate Chart */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Historical Reference Rate Series: {base}/{quote}
            </h2>
            <p className="text-xs text-slate-400">
              Daily middle rate observations provided by European Central Bank / Frankfurter v2
            </p>
          </div>
          <div className="flex items-center gap-1 bg-navy-950 p-1 rounded border border-slate-800">
            {["30D", "90D", "1Y", "5Y", "ALL"].map((btn) => (
              <button
                key={btn}
                onClick={() => setTimeRange(btn)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  timeRange === btn
                    ? "bg-brand-blue text-navy-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredRates}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => Number(v).toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "#334155",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                name={`${base}/${quote}`}
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#rateGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7-Day Multi-Model Forecast Preview */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal" />
              <span>Multi-Model 7-Day Forecast Snapshot</span>
            </h2>
            <p className="text-xs text-slate-400">
              Boundary separates historical observations from out-of-sample statistical predictions
            </p>
          </div>
          <span className="text-xs font-mono text-brand-teal px-2 py-0.5 rounded bg-brand-teal/10 border border-brand-teal/20">
            H = 7 Business Days
          </span>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedForecastChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => Number(v).toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "#334155",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="historical"
                name="Historical"
                stroke="#94a3b8"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="linear_regression"
                name="Linear Reg"
                stroke="#38bdf8"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="arima"
                name="ARIMA"
                stroke="#a855f7"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="holt"
                name="Holt's Linear"
                stroke="#f59e0b"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="random_forest"
                name="Random Forest"
                stroke="#10b981"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="naive_benchmark"
                name="Naive Benchmark"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

