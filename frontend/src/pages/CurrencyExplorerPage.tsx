import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { MetricCard } from "../components/MetricCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { RateItem, DescriptiveStatisticsResponse } from "../types";
import { Search, Calendar, Download, RefreshCw, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const CurrencyExplorerPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [compareQuote, setCompareQuote] = useState<string>("EUR");
  const [compareRates, setCompareRates] = useState<RateItem[]>([]);
  const [stats, setStats] = useState<DescriptiveStatisticsResponse | null>(null);
  const [startDate, setStartDate] = useState<string>("2022-01-01");
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, statsRes] = await Promise.all([
        api.getHistoricalRates(base, quote, startDate, endDate),
        api.getStatistics(base, quote, startDate, endDate),
      ]);
      setRates(histRes.rates);
      setStats(statsRes);

      // Fetch comparison pair if different
      if (compareQuote && compareQuote !== quote && compareQuote !== base) {
        try {
          const compRes = await api.getHistoricalRates(base, compareQuote, startDate, endDate);
          setCompareRates(compRes.rates);
        } catch {
          setCompareRates([]);
        }
      }
    } catch (err) {
      console.error("Error in CurrencyExplorer:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [base, quote, startDate, endDate, compareQuote]);

  // Combine comparison normalized (Base 100)
  const normalizedChartData = React.useMemo(() => {
    if (!rates.length) return [];
    const base0 = rates[0]?.rate || 1;
    const comp0 = compareRates[0]?.rate || 1;

    const compMap = new Map(compareRates.map((r) => [r.date, r.rate]));

    return rates.map((r) => {
      const cRate = compMap.get(r.date);
      return {
        date: r.date,
        primary_actual: r.rate,
        primary_norm: Number(((r.rate / base0) * 100).toFixed(2)),
        compare_norm: cRate ? Number(((cRate / comp0) * 100).toFixed(2)) : undefined,
      };
    });
  }, [rates, compareRates]);

  const filteredRates = rates.filter((r) =>
    r.date.includes(searchFilter) || r.rate.toString().includes(searchFilter)
  );
  const totalPages = Math.ceil(filteredRates.length / pageSize) || 1;
  const paginatedRates = filteredRates.slice((page - 1) * pageSize, page * pageSize);

  const downloadCSV = () => {
    const headers = "date,base,quote,rate,data_source,is_derived\n";
    const rows = rates
      .map(
        (r) =>
          `${r.date},${r.base},${r.quote},${r.rate},${r.data_source || "Frankfurter v2"},${
            r.is_derived ? "true" : "false"
          }`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${base}_${quote}_historical_rates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {/* Date Filters & Comparison Controls */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-navy-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-navy-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Cross-Compare With Quote
            </label>
            <select
              value={compareQuote}
              onChange={(e) => setCompareQuote(e.target.value)}
              className="bg-navy-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
            >
              {currencies.map((c) => (
                <option key={c.iso_code} value={c.iso_code}>
                  {base}/{c.iso_code} ({c.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-xs font-mono rounded border border-brand-blue/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating descriptive statistics and time-series series..." />
      ) : (
        <>
          {/* Descriptive Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <MetricCard label="Mean Rate" value={stats.levels_stats.mean.toFixed(4)} />
              <MetricCard label="Median Rate" value={stats.levels_stats.median.toFixed(4)} />
              <MetricCard label="Std Deviation" value={stats.levels_stats.std.toFixed(4)} />
              <MetricCard label="Min Rate" value={stats.levels_stats.min.toFixed(4)} />
              <MetricCard label="Max Rate" value={stats.levels_stats.max.toFixed(4)} />
              <MetricCard label="Skewness" value={stats.levels_stats.skewness.toFixed(3)} />
            </div>
          )}

          {/* Comparative Normalized Chart (Base = 100) */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Relative Performance Comparison (Normalized to 100 at {startDate})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Comparing index movements: {base}/{quote} vs {base}/{compareQuote}
                </p>
              </div>
            </div>

            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedChartData}>
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
                  <Line
                    type="monotone"
                    dataKey="primary_norm"
                    name={`${base}/${quote} (Idx 100)`}
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  {compareRates.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="compare_norm"
                      name={`${base}/${compareQuote} (Idx 100)`}
                      stroke="#f59e0b"
                      strokeWidth={1.8}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Observations Table */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Daily Historical Reference Rates Table
                </h3>
                <p className="text-[11px] text-slate-400">
                  {rates.length} validated business day records
                </p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter date or rate..."
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-navy-950 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Exchange Rate</th>
                    <th className="py-2.5 px-3">Daily Change</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Derived?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedRates.map((r, i) => {
                    const prev = i < paginatedRates.length - 1 ? paginatedRates[i + 1].rate : r.rate;
                    const change = prev !== 0 ? ((r.rate - prev) / prev) * 100 : 0;
                    return (
                      <tr key={r.date} className="hover:bg-navy-800/40">
                        <td className="py-2 px-3 text-slate-300">{r.date}</td>
                        <td className="py-2 px-3 text-slate-400">
                          1 {r.base} = ? {r.quote}
                        </td>
                        <td className="py-2 px-3 font-semibold text-white">{r.rate.toFixed(5)}</td>
                        <td
                          className={`py-2 px-3 ${
                            change >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(3)}%
                        </td>
                        <td className="py-2 px-3 text-slate-400">{r.data_source || "Frankfurter v2"}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              r.is_derived
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {r.is_derived ? "Derived" : "Direct"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-3 text-xs text-slate-400">
              <span>
                Page {page} of {totalPages} ({filteredRates.length} total)
              </span>
              <div className="flex gap-1.5 font-mono">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-navy-950 border border-slate-700 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-navy-950 border border-slate-700 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

