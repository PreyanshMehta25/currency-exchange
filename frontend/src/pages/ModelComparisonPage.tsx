import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { MetricCard } from "../components/MetricCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { ForecastCompareResponse, BacktestResponse, ModelRankingItem } from "../types";
import {
  BarChart3,
  Trophy,
  Activity,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const ModelComparisonPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [horizon, setHorizon] = useState<number>(7);
  const [selectedMetric, setSelectedMetric] = useState<string>("mae");
  const [compareData, setCompareData] = useState<ForecastCompareResponse | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestResponse | null>(null);
  const [rankings, setRankings] = useState<ModelRankingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [backtesting, setBacktesting] = useState<boolean>(false);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const [cmpRes, rankRes] = await Promise.all([
        api.compareForecasts(base, quote, horizon),
        api.getRankings(base, quote, selectedMetric, horizon),
      ]);
      setCompareData(cmpRes);
      setRankings(rankRes);
    } catch (err) {
      console.error("Comparison fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [base, quote, horizon, selectedMetric]);

  const handleRunFullBacktest = async () => {
    setBacktesting(true);
    try {
      const res = await api.runBacktest(
        base,
        quote,
        [7, 15, 30],
        ["linear_regression", "arima", "sarima", "holt", "random_forest"],
        "expanding",
        0.70,
        15
      );
      setBacktestData(res);
      // Refresh rankings
      const rankRes = await api.getRankings(base, quote, selectedMetric, horizon);
      setRankings(rankRes);
    } catch (err: any) {
      alert(`Backtesting failed: ${err.message}`);
    } finally {
      setBacktesting(false);
    }
  };

  // Metric Comparison Chart Data
  const metricBarData = React.useMemo(() => {
    if (!compareData) return [];
    const models = [
      "linear_regression",
      "arima",
      "sarima",
      "holt",
      "random_forest",
      "naive_benchmark",
    ];

    return models.map((m) => {
      const mMetrics = compareData.evaluation_metrics[m] || {};
      const isBenchmark = m === "naive_benchmark";
      const name = isBenchmark ? "Naive Benchmark" : m.replace("_", " ").toUpperCase();
      return {
        name,
        mae: mMetrics.mae ?? 0,
        rmse: mMetrics.rmse ?? 0,
        mape: mMetrics.mape ?? 0,
        da: mMetrics.directional_accuracy ?? 0,
        isBenchmark,
      };
    });
  }, [compareData]);

  if (loading) {
    return <LoadingSpinner message="Evaluating models on identical chronological test periods..." />;
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

      {/* Control Strip */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-slate-400">Horizon:</span>
            {[7, 15, 30].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  horizon === h
                    ? "bg-brand-blue text-navy-950 font-bold"
                    : "bg-navy-950 text-slate-300 border border-slate-700"
                }`}
              >
                {h} Obs
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-slate-400">Ranking Metric:</span>
            {[
              { id: "mae", label: "MAE" },
              { id: "rmse", label: "RMSE" },
              { id: "mape", label: "MAPE %" },
              { id: "directional_accuracy", label: "Directional %" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  selectedMetric === m.id
                    ? "bg-brand-teal text-navy-950 font-bold"
                    : "bg-navy-950 text-slate-300 border border-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRunFullBacktest}
          disabled={backtesting}
          className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-slate-700 text-brand-teal text-xs font-mono rounded border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${backtesting ? "animate-spin" : ""}`} />
          <span>{backtesting ? "Backtesting Across Origins..." : "Run Rolling-Origin Backtest"}</span>
        </button>
      </div>

      {/* Best Model Summary Cards */}
      {compareData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Lowest MAE Model"
            value={compareData.best_models.mae.replace("_", " ").toUpperCase()}
            badge="Top Accuracy"
            icon={Trophy}
          />
          <MetricCard
            label="Lowest RMSE Model"
            value={compareData.best_models.rmse.replace("_", " ").toUpperCase()}
            badge="Penalizes Large Errors"
            icon={Activity}
          />
          <MetricCard
            label="Lowest MAPE Model"
            value={compareData.best_models.mape.replace("_", " ").toUpperCase()}
            badge="Percentage Error"
            icon={BarChart3}
          />
          <MetricCard
            label="Best Directional Accuracy"
            value={compareData.best_models.directional_accuracy.replace("_", " ").toUpperCase()}
            badge="Trend Direction"
            icon={Trophy}
          />
        </div>
      )}

      {/* Comparison Bar Charts: MAE & Directional Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAE Bar Chart */}
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Mean Absolute Error (MAE) Comparison — Lower is Better
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluated on identical {horizon}-observation out-of-sample test window
            </p>
          </div>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                />
                <Bar dataKey="mae" name="MAE" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Directional Accuracy Bar Chart */}
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Directional Accuracy (%) — Higher is Better
            </h3>
            <p className="text-[11px] text-slate-400">
              Percentage of periods where movement direction matched actual movement
            </p>
          </div>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                />
                <Bar dataKey="da" name="Directional Accuracy %" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Rankings Table */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-amber" />
              <span>
                Dynamic Model Leaderboard (Ranked by {selectedMetric.toUpperCase()}, Horizon = {horizon})
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Rankings updated dynamically from actual backtest evaluations
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Forecasting Approach</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">{selectedMetric.toUpperCase()} Score</th>
                <th className="py-2.5 px-3">Evaluation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankings.map((r) => (
                <tr key={r.model_name} className="hover:bg-navy-800/40">
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        r.rank === 1
                          ? "bg-brand-amber text-navy-950"
                          : r.rank === 2
                          ? "bg-slate-300 text-navy-950"
                          : r.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-navy-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-white">{r.display_name}</td>
                  <td className="py-2 px-3 text-slate-400">
                    {r.model_name.includes("forest")
                      ? "Machine Learning"
                      : r.model_name.includes("naive")
                      ? "Baseline Benchmark"
                      : "Statistical Time-Series"}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-brand-blue">
                    {r.metric_value.toFixed(4)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                      Validated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

