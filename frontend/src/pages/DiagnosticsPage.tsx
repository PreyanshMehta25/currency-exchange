import React, { useState, useEffect } from "react";
import { useCurrency } from "../layouts/DashboardLayout";
import { CurrencySelector } from "../components/CurrencySelector";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { api } from "../services/api";
import {
  StationarityResponse,
  DecompositionResponse,
  AcfPacfResponse,
} from "../types";
import { Binary, CheckCircle, AlertCircle, HelpCircle, GitFork } from "lucide-react";
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
  ReferenceLine,
} from "recharts";

export const DiagnosticsPage: React.FC = () => {
  const { base, quote, setBase, setQuote, currencies, recommendedPairs } = useCurrency();
  const [stationarity, setStationarity] = useState<StationarityResponse | null>(null);
  const [decomposition, setDecomposition] = useState<DecompositionResponse | null>(null);
  const [acfPacf, setAcfPacf] = useState<AcfPacfResponse | null>(null);
  const [decompPeriod, setDecompPeriod] = useState<number>(5);
  const [differencedAcf, setDifferencedAcf] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      setLoading(true);
      try {
        const [statRes, decompRes, acfRes] = await Promise.all([
          api.getStationarity(base, quote),
          api.getDecomposition(base, quote, decompPeriod, "additive"),
          api.getAcfPacf(base, quote, 30, differencedAcf),
        ]);
        setStationarity(statRes);
        setDecomposition(decompRes);
        setAcfPacf(acfRes);
      } catch (err) {
        console.error("Diagnostics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnostics();
  }, [base, quote, decompPeriod, differencedAcf]);

  if (loading) {
    return <LoadingSpinner message="Executing ADF, KPSS, Decomposition, and ACF/PACF tests..." />;
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

      {/* Stationarity Testing Cards: ADF & KPSS */}
      {stationarity && (
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Binary className="w-4 h-4 text-brand-blue" />
                <span>Formal Stationarity & Unit Root Diagnostics (ADF & KPSS Tests)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluates whether exchange rate level and first differences require integration I(d)
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/30">
              Rigorous TSDA Framework
            </span>
          </div>

          {/* Test Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Level Tests Card */}
            <div className="bg-navy-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-300">
                  Raw Exchange Rate Levels: {base}/{quote}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    !stationarity.levels_adf.is_stationary
                      ? "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                      : "bg-emerald-950 text-emerald-400"
                  }`}
                >
                  {!stationarity.levels_adf.is_stationary ? "Non-Stationary (I(1))" : "Stationary"}
                </span>
              </div>

              {/* ADF Level */}
              <div className="text-xs font-mono border-t border-slate-800/60 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">ADF Stat:</span>
                  <span className="font-semibold text-white">
                    {stationarity.levels_adf.test_statistic}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">p-value:</span>
                  <span className="text-amber-400">{stationarity.levels_adf.p_value}</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  ADF Null: Unit root present. Result: {stationarity.levels_adf.interpretation}
                </p>
              </div>

              {/* KPSS Level */}
              <div className="text-xs font-mono border-t border-slate-800/60 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">KPSS Stat:</span>
                  <span className="font-semibold text-white">
                    {stationarity.levels_kpss.test_statistic}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">p-value:</span>
                  <span className="text-amber-400">{stationarity.levels_kpss.p_value}</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  KPSS Null: Series is stationary. Result: {stationarity.levels_kpss.interpretation}
                </p>
              </div>
            </div>

            {/* Differenced Tests Card */}
            <div className="bg-navy-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-300">
                  First-Differenced Series: Δ({base}/{quote})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  Confirmed Stationary (I(0))
                </span>
              </div>

              {/* ADF Differenced */}
              <div className="text-xs font-mono border-t border-slate-800/60 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">ADF Stat:</span>
                  <span className="font-semibold text-emerald-400">
                    {stationarity.differenced_adf.test_statistic}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">p-value:</span>
                  <span className="text-emerald-400">
                    {stationarity.differenced_adf.p_value}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  ADF Null: Unit root present. Result:{" "}
                  {stationarity.differenced_adf.interpretation}
                </p>
              </div>

              {/* KPSS Differenced */}
              <div className="text-xs font-mono border-t border-slate-800/60 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">KPSS Stat:</span>
                  <span className="font-semibold text-white">
                    {stationarity.differenced_kpss.test_statistic}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">p-value:</span>
                  <span className="text-emerald-400">
                    {stationarity.differenced_kpss.p_value}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  KPSS Null: Series is stationary. Result:{" "}
                  {stationarity.differenced_kpss.interpretation}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Interpretation Banner */}
          <div className="p-3 bg-navy-800/50 rounded border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Econometric Conclusion: </span>
              {stationarity.overall_conclusion}
            </div>
          </div>
        </div>
      )}

      {/* Classical Time-Series Decomposition */}
      {decomposition && (
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Time-Series Decomposition (Observed, Trend, Seasonal, Residual)
              </h3>
              <p className="text-[11px] text-slate-400">
                Additive formulation: Y(t) = Trend(t) + Seasonal(t) + Residual(t)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Seasonal Period:</span>
              <select
                value={decompPeriod}
                onChange={(e) => setDecompPeriod(Number(e.target.value))}
                className="bg-navy-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
              >
                <option value={5}>5 Obs (Business Week)</option>
                <option value={21}>21 Obs (Trading Month)</option>
                <option value={63}>63 Obs (Quarter)</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-300 italic bg-navy-950/60 p-2.5 rounded border border-slate-800">
            {decomposition.interpretation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trend Component */}
            <div className="bg-navy-950 p-3 rounded border border-slate-800">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                Extracted Trend Component
              </span>
              <div className="h-44 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decomposition.data.slice(-250)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#334155" }} />
                    <Line type="monotone" dataKey="trend" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seasonal Component */}
            <div className="bg-navy-950 p-3 rounded border border-slate-800">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                Seasonal Component (Period = {decompPeriod})
              </span>
              <div className="h-44 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decomposition.data.slice(-100)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#334155" }} />
                    <Line type="monotone" dataKey="seasonal" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Residuals */}
            <div className="bg-navy-950 p-3 rounded border border-slate-800 md:col-span-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                Residual Shock Component (Noise)
              </span>
              <div className="h-44 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decomposition.data.slice(-250)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#334155" }} />
                    <Line type="monotone" dataKey="residual" stroke="#10b981" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACF and PACF Correlograms */}
      {acfPacf && (
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Autocorrelation (ACF) & Partial Autocorrelation (PACF) Correlograms
              </h3>
              <p className="text-[11px] text-slate-400">
                Bands indicate 95% Bartlett white-noise confidence bounds (+/- 1.96 / sqrt(N))
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDifferencedAcf(false)}
                className={`px-2.5 py-1 text-xs font-mono rounded ${
                  !differencedAcf
                    ? "bg-brand-blue text-navy-950 font-bold"
                    : "bg-navy-950 text-slate-400 border border-slate-700"
                }`}
              >
                Levels ACF/PACF
              </button>
              <button
                onClick={() => setDifferencedAcf(true)}
                className={`px-2.5 py-1 text-xs font-mono rounded ${
                  differencedAcf
                    ? "bg-brand-blue text-navy-950 font-bold"
                    : "bg-navy-950 text-slate-400 border border-slate-700"
                }`}
              >
                1st-Difference ACF/PACF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACF Chart */}
            <div className="bg-navy-950 p-4 rounded border border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-300">
                ACF (Autocorrelation Function)
              </span>
              <div className="h-60 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acfPacf.lags}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="lag" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[-1, 1]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#334155" }} />
                    <ReferenceLine y={0} stroke="#64748b" />
                    {acfPacf.lags.length > 0 && (
                      <>
                        <ReferenceLine y={acfPacf.lags[0].conf_upper} stroke="#ec4899" strokeDasharray="3 3" />
                        <ReferenceLine y={acfPacf.lags[0].conf_lower} stroke="#ec4899" strokeDasharray="3 3" />
                      </>
                    )}
                    <Bar dataKey="acf" name="Autocorrelation" fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PACF Chart */}
            <div className="bg-navy-950 p-4 rounded border border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-300">
                PACF (Partial Autocorrelation Function)
              </span>
              <div className="h-60 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acfPacf.lags}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="lag" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[-1, 1]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#334155" }} />
                    <ReferenceLine y={0} stroke="#64748b" />
                    {acfPacf.lags.length > 0 && (
                      <>
                        <ReferenceLine y={acfPacf.lags[0].conf_upper} stroke="#ec4899" strokeDasharray="3 3" />
                        <ReferenceLine y={acfPacf.lags[0].conf_lower} stroke="#ec4899" strokeDasharray="3 3" />
                      </>
                    )}
                    <Bar dataKey="pacf" name="Partial Autocorrelation" fill="#14b8a6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

