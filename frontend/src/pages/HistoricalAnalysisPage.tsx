import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { MetricCard } from "../components/MetricCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { RateItem, VolatilityPoint, DescriptiveStatisticsResponse } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Activity, BarChart2, Calendar } from "lucide-react";

export const HistoricalAnalysisPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [volatilitySeries, setVolatilitySeries] = useState<VolatilityPoint[]>([]);
  const [stats, setStats] = useState<DescriptiveStatisticsResponse | null>(null);
  const [volWindow, setVolWindow] = useState<number>(21);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [histRes, volRes, statsRes] = await Promise.all([
          api.getHistoricalRates(base, quote, "2018-01-01"),
          api.getVolatility(base, quote, volWindow, true),
          api.getStatistics(base, quote, "2018-01-01"),
        ]);
        setRates(histRes.rates);
        setVolatilitySeries(volRes.series);
        setStats(statsRes);
      } catch (err) {
        console.error("HistoricalAnalysis fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [base, quote, volWindow]);

  // Rolling Averages Series (7, 30, 90 observation windows)
  const rollingData = React.useMemo(() => {
    if (rates.length < 90) return [];
    return rates.slice(-500).map((r, idx, arr) => {
      const getRolling = (window: number) => {
        if (idx < window - 1) return undefined;
        const slice = arr.slice(idx - window + 1, idx + 1);
        const sum = slice.reduce((acc, curr) => acc + curr.rate, 0);
        return Number((sum / window).toFixed(4));
      };
      return {
        date: r.date,
        rate: r.rate,
        ma7: getRolling(7),
        ma30: getRolling(30),
        ma90: getRolling(90),
      };
    });
  }, [rates]);

  // Returns Series
  const returnsData = React.useMemo(() => {
    if (rates.length < 2) return [];
    const pts = [];
    for (let i = 1; i < rates.length; i++) {
      const prev = rates[i - 1].rate;
      const curr = rates[i].rate;
      const ret = ((curr - prev) / prev) * 100;
      pts.push({
        date: rates[i].date,
        return_pct: Number(ret.toFixed(3)),
      });
    }
    return pts.slice(-300); // Last 300 business days
  }, [rates]);

  // Returns Distribution Bins (Histogram)
  const distributionBins = React.useMemo(() => {
    if (rates.length < 2) return [];
    const rets = [];
    for (let i = 1; i < rates.length; i++) {
      const prev = rates[i - 1].rate;
      const curr = rates[i].rate;
      rets.push(((curr - prev) / prev) * 100);
    }
    const min = Math.min(...rets);
    const max = Math.max(...rets);
    const binCount = 20;
    const step = (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * step).toFixed(2)}%`,
      count: 0,
    }));
    rets.forEach((r) => {
      const idx = Math.min(Math.floor((r - min) / step), binCount - 1);
      if (idx >= 0 && idx < binCount) bins[idx].count++;
    });
    return bins;
  }, [rates]);

  // Monthly Averages
  const monthlyAverages = React.useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    rates.forEach((r) => {
      const monthKey = r.date.slice(0, 7); // YYYY-MM
      const current = map.get(monthKey) || { sum: 0, count: 0 };
      map.set(monthKey, { sum: current.sum + r.rate, count: current.count + 1 });
    });
    const result = [];
    for (const [m, val] of map.entries()) {
      result.push({ month: m, avg_rate: Number((val.sum / val.count).toFixed(4)) });
    }
    return result.slice(-24); // Last 24 months
  }, [rates]);

  if (loading) {
    return <LoadingSpinner message="Executing time-series exploratory decomposition..." />;
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

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Mean Return"
            value={`${stats.returns_stats.mean.toFixed(3)}%`}
            subtext="Daily percentage drift"
            icon={TrendingUp}
          />
          <MetricCard
            label="Daily Std Dev"
            value={`${stats.returns_stats.std.toFixed(3)}%`}
            subtext="Single-day price volatility"
            icon={Activity}
          />
          <MetricCard
            label="Return Kurtosis"
            value={stats.returns_stats.kurtosis.toFixed(2)}
            subtext={
              stats.returns_stats.kurtosis > 3 ? "Leptokurtic (Fat tails observed)" : "Normal tail spread"
            }
            icon={BarChart2}
          />
          <MetricCard
            label="Observations"
            value={rates.length.toLocaleString()}
            subtext="Daily business day observations"
            icon={Calendar}
          />
        </div>
      )}

      {/* Chart 1: Rolling Averages (7, 30, 90) */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Observation-Based Rolling Mean Trend (7, 30, and 90 Observations)
          </h3>
          <p className="text-[11px] text-slate-400">
            Smoothed trendlines computed strictly over chronological business days
          </p>
        </div>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rollingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "#334155",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line type="monotone" dataKey="rate" name="Daily Rate" stroke="#64748b" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="ma7" name="7-Obs MA" stroke="#38bdf8" strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="ma30" name="30-Obs MA" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="ma90" name="90-Obs MA" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Daily Percentage Returns */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Daily Percentage Returns (Stationary First-Difference Returns)
          </h3>
          <p className="text-[11px] text-slate-400">
            Rt = ((Pt - Pt-1) / Pt-1) * 100 — Captures volatility clustering and market shocks
          </p>
        </div>
        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={returnsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "#334155",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Bar dataKey="return_pct" name="Daily Return %" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 & 4: Rolling Volatility & Returns Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rolling Volatility */}
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Rolling Annualized Volatility
              </h3>
              <p className="text-[11px] text-slate-400">
                Window: {volWindow} observations * sqrt(252)
              </p>
            </div>
            <select
              value={volWindow}
              onChange={(e) => setVolWindow(Number(e.target.value))}
              className="bg-navy-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
            >
              <option value={7}>7-Day Window</option>
              <option value={21}>21-Day (1 Month)</option>
              <option value={63}>63-Day (Quarterly)</option>
            </select>
          </div>
          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volatilitySeries.slice(-250)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                />
                <Line type="monotone" dataKey="volatility" name="Volatility %" stroke="#14b8a6" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Returns Distribution Histogram */}
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Daily Returns Empirical Distribution
            </h3>
            <p className="text-[11px] text-slate-400">
              Histogram of daily % returns showcasing skewness and tail distribution
            </p>
          </div>
          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionBins}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                />
                <Bar dataKey="count" name="Frequency" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Average Exchange Rate Table & Chart */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Monthly Average Exchange Rates (Last 24 Months)
          </h3>
          <p className="text-[11px] text-slate-400">
            Aggregated monthly middle rates for long-term cycle inspection
          </p>
        </div>
        <div className="h-60 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "#334155",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
              />
              <Bar dataKey="avg_rate" name="Monthly Avg Rate" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

