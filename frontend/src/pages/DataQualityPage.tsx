import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { MetricCard } from "../components/MetricCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import { DataQualityReport, ProviderInfo } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";

export const DataQualityPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchQuality = async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        api.getDataQuality(base, quote),
        api.getProviders().catch(() => []),
      ]);
      setReport(qRes);
      setProviders(pRes);
    } catch (err) {
      console.error("Quality fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality();
  }, [base, quote]);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.refreshData(base, quote);
      if (res.quality_report) {
        setReport(res.quality_report);
      }
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Auditing data hygiene, missing dates, and outliers..." />;
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

      {/* Header with Force Refresh Action */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-teal" />
            <span>Dataset Integrity & Preprocessing Audit: {base}/{quote}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time validation against duplicate observations, non-trading calendar gaps, and outlier movements
          </p>
        </div>

        <button
          onClick={handleForceRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 bg-navy-800 hover:bg-slate-700 text-brand-blue text-xs font-mono font-semibold rounded border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Re-fetching Provider..." : "Force API Refresh"}</span>
        </button>
      </div>

      {report && (
        <>
          {/* Quality Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Valid Observations"
              value={report.total_observations.toLocaleString()}
              subtext={`Start: ${report.start_date}`}
              icon={Database}
            />
            <MetricCard
              label="Expected Business Days"
              value={report.expected_business_days.toLocaleString()}
              subtext={`End: ${report.end_date}`}
              icon={Calendar}
            />
            <MetricCard
              label="Missing Observations"
              value={report.missing_observations.toLocaleString()}
              subtext="Bank holidays & non-publishing days"
              icon={AlertTriangle}
              trend={report.missing_observations > 0 ? "neutral" : "up"}
            />
            <MetricCard
              label="Outlier Flags (IQR 1.5x)"
              value={report.outlier_count}
              subtext="Preserved genuine market behavior"
              icon={CheckCircle2}
              badge="Retained"
            />
          </div>

          {/* Source Attribution & Cache Status Card */}
          <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Provider & Local Storage Metadata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Source:</span>
                  <span className="text-white font-semibold">{report.data_source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cache Status:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      report.is_cached
                        ? "bg-brand-blue/20 text-brand-blue"
                        : "bg-emerald-950 text-emerald-400"
                    }`}
                  >
                    {report.is_cached ? "Served from Local Cache" : "Live Fetched"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Refresh:</span>
                  <span className="text-slate-300">{report.last_refresh || "Just now"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duplicate Dates Detected:</span>
                  <span className="text-slate-300">{report.duplicate_observations} (Filtered)</span>
                </div>
              </div>

              <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean Rate:</span>
                  <span className="text-white">{report.mean_rate.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Std Deviation:</span>
                  <span className="text-white">{report.std_rate.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Historical Min / Max:</span>
                  <span className="text-slate-300">
                    {report.min_rate.toFixed(4)} — {report.max_rate.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cumulative Period Return:</span>
                  <span
                    className={`font-bold ${
                      report.percentage_change >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {report.percentage_change >= 0 ? "+" : ""}
                    {report.percentage_change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Flags Breakdown */}
            {report.data_quality_flags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-2">
                  Data Pipeline Audit Annotations:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {report.data_quality_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* Available Data Providers in Frankfurter */}
      {providers.length > 0 && (
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
            Frankfurter v2 Upstream Central Bank Providers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.slice(0, 6).map((p) => (
              <div key={p.key} className="bg-navy-950 p-3 rounded border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-brand-blue">{p.key}</span>
                  <span className="text-[10px] text-slate-400">{p.rate_type || "Mid Rate"}</span>
                </div>
                <p className="text-slate-300 text-[11px] truncate">{p.name}</p>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>Pivot: {p.pivot_currency || "EUR"}</span>
                  <span>Cadence: {p.publish_cadence || "daily"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

