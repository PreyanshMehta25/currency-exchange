import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { ForecastResponse, RateItem, ModelForecastResult } from "../types";
import {
  Play,
  Download,
  Calendar,
  Sparkles,
  Layers,
  HelpCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
  ComposedChart,
} from "recharts";

const AVAILABLE_MODELS = [
  { id: "linear_regression", name: "Linear Regression", color: "#38bdf8" },
  { id: "arima", name: "ARIMA (Auto p,d,q)", color: "#a855f7" },
  { id: "sarima", name: "SARIMA (Seasonal s=5)", color: "#ec4899" },
  { id: "holt", name: "Holt's Linear Smoothing", color: "#f59e0b" },
  { id: "random_forest", name: "Random Forest Regressor", color: "#10b981" },
];

export const ForecastingPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [selectedHorizon, setSelectedHorizon] = useState<number>(7);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "linear_regression",
    "arima",
    "sarima",
    "holt",
    "random_forest",
  ]);
  const [showIntervals, setShowIntervals] = useState<boolean>(true);
  const [activeIntervalModel, setActiveIntervalModel] = useState<string>("arima");

  const [rates, setRates] = useState<RateItem[]>([]);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRatesAndForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, fcRes] = await Promise.all([
        api.getHistoricalRates(base, quote, "2023-01-01"),
        api.runForecast(base, quote, selectedHorizon, selectedModels),
      ]);
      setRates(histRes.rates);
      setForecastResult(fcRes);
    } catch (err: any) {
      console.error("Forecasting fetch error:", err);
      setError(err.message || "Failed to generate forecasts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatesAndForecast();
  }, [base, quote, selectedHorizon]);

  const handleRunCustomForecast = async () => {
    if (selectedModels.length === 0) {
      alert("Please select at least one forecasting model.");
      return;
    }
    setExecuting(true);
    try {
      const fcRes = await api.runForecast(base, quote, selectedHorizon, selectedModels);
      setForecastResult(fcRes);
    } catch (err: any) {
      alert(`Forecast execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId]
    );
  };

  // Build chart dataset
  const chartData = React.useMemo(() => {
    if (!rates.length || !forecastResult) return [];
    // Show last 20 historical days
    const histPoints = rates.slice(-20).map((r) => ({
      date: r.date,
      historical: r.rate,
      linear_regression: undefined,
      arima: undefined,
      sarima: undefined,
      holt: undefined,
      random_forest: undefined,
      naive_benchmark: undefined,
      lower_band: undefined,
      upper_band: undefined,
    }));

    const lastHistRate = rates[rates.length - 1].rate;
    const lastHistDate = rates[rates.length - 1].date;

    // Boundary connector
    const futurePoints = forecastResult.forecast_dates.map((d, idx) => {
      const point: any = {
        date: d,
        historical: undefined,
      };

      selectedModels.forEach((mId) => {
        const mRes = forecastResult.forecasts[mId];
        if (mRes && mRes.predictions[idx]) {
          point[mId] = mRes.predictions[idx].predicted_rate;
        }
      });

      if (forecastResult.naive_benchmark?.predictions[idx]) {
        point.naive_benchmark = forecastResult.naive_benchmark.predictions[idx].predicted_rate;
      }

      // Interval band for the active interval model
      const intRes = forecastResult.forecasts[activeIntervalModel];
      if (intRes && intRes.predictions[idx]) {
        point.lower_band = intRes.predictions[idx].lower_bound;
        point.upper_band = intRes.predictions[idx].upper_bound;
      }

      return point;
    });

    return [...histPoints, ...futurePoints];
  }, [rates, forecastResult, selectedModels, activeIntervalModel]);

  const downloadCSV = () => {
    if (!forecastResult) return;
    const headers = ["date", ...selectedModels, "naive_benchmark"].join(",") + "\n";
    const rows = forecastResult.forecast_dates
      .map((d, idx) => {
        const rowVals = [d];
        selectedModels.forEach((mId) => {
          rowVals.push(
            forecastResult.forecasts[mId]?.predictions[idx]?.predicted_rate?.toString() || ""
          );
        });
        rowVals.push(
          forecastResult.naive_benchmark?.predictions[idx]?.predicted_rate?.toString() || ""
        );
        return rowVals.join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${base}_${quote}_H${selectedHorizon}_forecast.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner message="Fitting models and generating multi-step forecasts..." />;
  }

  return (
    <div className="space-y-6">
      <CurrencySelector
        base={base}
        quote={quote}
        onBaseChange={setBase}
        onQuoteChange={setQuote}
        currencies={currencies}
        recommendedPairs={recommendedPairs}
      />

      {/* Control Panel: Horizons & Model Selection */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Forecasting Configuration & Horizon Selection
            </h3>
            <p className="text-[11px] text-slate-400">
              Horizons represent available daily reference-rate business observations, not calendar days.
            </p>
          </div>

          {/* Horizon Selection Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase">Horizon (H):</span>
            {[7, 15, 30].map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  selectedHorizon === h
                    ? "bg-brand-blue text-navy-950 font-bold"
                    : "bg-navy-950 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                {h} Obs
              </button>
            ))}
          </div>
        </div>

        {/* Model Checkboxes */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Models:</span>
          {AVAILABLE_MODELS.map((m) => {
            const isSelected = selectedModels.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                  isSelected
                    ? "bg-navy-800 text-white border-slate-600"
                    : "bg-navy-950/60 text-slate-500 border-slate-800 hover:text-slate-300"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: m.color }} />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>{m.name}</span>
              </button>
            );
          })}

          <button
            onClick={handleRunCustomForecast}
            disabled={executing}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-teal text-navy-950 font-bold text-xs font-mono rounded shadow hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{executing ? "Computing..." : "Run Forecast"}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Forecast Chart */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal" />
              <span>Multi-Step Forecast Chart ({selectedHorizon} Future Business Days)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Solid line: Observed Rates | Dashed lines: Multi-Step Recursive & Analytical Forecasts
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Uncertainty Interval Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span>Interval Band:</span>
              <select
                value={activeIntervalModel}
                onChange={(e) => setActiveIntervalModel(e.target.value)}
                className="bg-navy-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                {selectedModels.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-xs font-mono rounded border border-brand-blue/30 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
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
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

              {/* Historical actuals */}
              <Line
                type="monotone"
                dataKey="historical"
                name="Historical Rate"
                stroke="#94a3b8"
                strokeWidth={2.5}
                dot={false}
              />

              {/* Model lines */}
              {selectedModels.includes("linear_regression") && (
                <Line
                  type="monotone"
                  dataKey="linear_regression"
                  name="Linear Reg"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3 }}
                />
              )}
              {selectedModels.includes("arima") && (
                <Line
                  type="monotone"
                  dataKey="arima"
                  name="ARIMA"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3 }}
                />
              )}
              {selectedModels.includes("sarima") && (
                <Line
                  type="monotone"
                  dataKey="sarima"
                  name="SARIMA"
                  stroke="#ec4899"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3 }}
                />
              )}
              {selectedModels.includes("holt") && (
                <Line
                  type="monotone"
                  dataKey="holt"
                  name="Holt Linear"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3 }}
                />
              )}
              {selectedModels.includes("random_forest") && (
                <Line
                  type="monotone"
                  dataKey="random_forest"
                  name="Random Forest"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3 }}
                />
              )}

              {/* Naive benchmark */}
              <Line
                type="monotone"
                dataKey="naive_benchmark"
                name="Naive Benchmark"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />

              {/* Prediction Interval Bounds */}
              {showIntervals && (
                <Line
                  type="monotone"
                  dataKey="upper_band"
                  name={`${activeIntervalModel.toUpperCase()} Upper 95%`}
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
              {showIntervals && (
                <Line
                  type="monotone"
                  dataKey="lower_band"
                  name={`${activeIntervalModel.toUpperCase()} Lower 95%`}
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Parameters & Diagnostics Cards */}
      {forecastResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(forecastResult.forecasts).map(([mKey, mRes]) => (
            <div key={mKey} className="bg-navy-900/80 border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {mRes.display_name}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    mRes.fitting_status === "success"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                      : "bg-rose-950 text-rose-400 border border-rose-800/40"
                  }`}
                >
                  {mRes.fitting_status}
                </span>
              </div>

              <div className="text-xs font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Multi-Step Strategy:</span>
                  <span className="capitalize text-brand-blue">{mRes.multi_step_strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Training Obs:</span>
                  <span>{mRes.training_observations}</span>
                </div>

                {mRes.parameters &&
                  Object.entries(mRes.parameters).slice(0, 4).map(([pKey, pVal]) => (
                    <div key={pKey} className="flex justify-between">
                      <span className="text-slate-500 capitalize">{pKey.replace("_", " ")}:</span>
                      <span className="text-slate-200 truncate max-w-[150px]">
                        {typeof pVal === "object" ? JSON.stringify(pVal) : String(pVal)}
                      </span>
                    </div>
                  ))}

                {mRes.interval_method && (
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 italic">
                    Uncertainty: {mRes.interval_method}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forecast Data Table */}
      {forecastResult && (
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
            Forecast Predictions Data Table ({selectedHorizon} Observation Days Ahead)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Horizon</th>
                  <th className="py-2.5 px-3">Target Date</th>
                  {selectedModels.map((m) => (
                    <th key={m} className="py-2.5 px-3">
                      {m.replace("_", " ").toUpperCase()}
                    </th>
                  ))}
                  <th className="py-2.5 px-3">NAIVE BENCHMARK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {forecastResult.forecast_dates.map((d, idx) => (
                  <tr key={d} className="hover:bg-navy-800/40">
                    <td className="py-2 px-3 text-brand-blue font-semibold">T+{idx + 1}</td>
                    <td className="py-2 px-3 text-slate-300">{d}</td>
                    {selectedModels.map((m) => {
                      const val = forecastResult.forecasts[m]?.predictions[idx]?.predicted_rate;
                      return (
                        <td key={m} className="py-2 px-3 font-semibold text-white">
                          {val !== undefined ? val.toFixed(5) : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-slate-400">
                      {forecastResult.naive_benchmark?.predictions[idx]?.predicted_rate?.toFixed(5) ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

