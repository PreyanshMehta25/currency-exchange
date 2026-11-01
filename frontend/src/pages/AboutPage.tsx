import React, { useState, useEffect } from "react";
import {
  BookOpen,
  HelpCircle,
  Cpu,
  Layers,
  Scale,
  Users,
  ShieldAlert,
  Edit2,
  Check,
} from "lucide-react";

export const AboutPage: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
    const saved = localStorage.getItem("fx_insight_team");
    return saved ? JSON.parse(saved) : ["Preyansh Mehta", "Quantitative Researcher", "TSDA Analyst"];
  });
  const [isEditingTeam, setIsEditingTeam] = useState<boolean>(false);
  const [tempNames, setTempNames] = useState<string[]>(teamMembers);

  const handleSaveTeam = () => {
    setTeamMembers(tempNames);
    localStorage.setItem("fx_insight_team", JSON.stringify(tempNames));
    setIsEditingTeam(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="bg-navy-900 border border-slate-800 rounded-lg p-6 space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-blue font-bold px-2 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20">
          University Time Series Data Analysis (TSDA)
        </span>
        <h1 className="text-2xl font-bold font-mono text-white">
          FX Insight — Multi-Currency Exchange Rate Forecasting & Comparative Platform
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          An institutional-grade, full-stack quantitative research application designed to retrieve historical
          exchange-rate data across multiple currency pairs, perform rigorous time-series analysis, implement
          five statistical and machine learning forecasting models, comparatively evaluate their out-of-sample
          predictive performance, and present actionable financial insights.
        </p>
      </div>

      {/* Project Team Section (Editable) */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-teal" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Project Research Team (Viva Presentation Group)
            </h3>
          </div>
          <button
            onClick={() => {
              if (isEditingTeam) handleSaveTeam();
              else {
                setTempNames(teamMembers);
                setIsEditingTeam(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-navy-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded border border-slate-700 transition-colors"
          >
            {isEditingTeam ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Members</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 text-brand-blue" />
                <span>Edit Names</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="bg-navy-950 p-4 rounded border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Researcher #{idx + 1}
              </span>
              {isEditingTeam ? (
                <input
                  type="text"
                  value={tempNames[idx] || ""}
                  onChange={(e) => {
                    const updated = [...tempNames];
                    updated[idx] = e.target.value;
                    setTempNames(updated);
                  }}
                  className="w-full bg-navy-900 border border-brand-blue/50 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                />
              ) : (
                <span className="font-semibold text-sm text-slate-200 font-mono">{member}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Research Objectives & Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-brand-blue" />
            <span>Core Research Objective</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic bg-navy-950 p-3 rounded border border-slate-800/80">
            "To comparatively evaluate statistical and machine-learning-based forecasting techniques for predicting
            exchange-rate movements across multiple currency pairs and forecast horizons, identifying the models that
            provide the most accurate and consistent forecasts."
          </p>
        </div>

        <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-brand-teal" />
            <span>Investigated Research Questions</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Which forecasting model performs best across different currency pairs?</li>
            <li>Does forecasting accuracy deteriorate significantly as horizon increases (7 → 15 → 30)?</li>
            <li>Do machine-learning approaches (Random Forest) outperform traditional statistical models (ARIMA)?</li>
            <li>Does the presence of volatility or trend affect forecasting performance?</li>
          </ul>
        </div>
      </div>

      {/* The Five Forecasting Approaches */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-brand-purple" />
          <span>Implemented Forecasting Models Framework</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-brand-blue block text-sm">1. Linear Regression</span>
            <p className="text-slate-400">
              Autoregressive lagged predictors (Lags 1, 2, 3, 5, 10) combined with 5 & 10 observation rolling means
              and standard deviations. Multi-step forecasting is executed via pure recursive projection.
            </p>
          </div>

          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-brand-purple block text-sm">2. ARIMA (Auto p, d, q)</span>
            <p className="text-slate-400">
              Classical Box-Jenkins methodology. Differencing order d is statistically determined via Augmented
              Dickey-Fuller tests; p and q orders are optimized through bounded AIC/BIC search.
            </p>
          </div>

          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-brand-rose block text-sm">3. SARIMA (Seasonal Order)</span>
            <p className="text-slate-400">
              Extends ARIMA with seasonal periodicity s=5 (trading week business days). AIC/BIC penalization verifies
              whether calendar seasonality contributes empirical predictive power over parsimonious ARIMA.
            </p>
          </div>

          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-brand-amber block text-sm">4. Holt's Linear Smoothing</span>
            <p className="text-slate-400">
              State-space exponential smoothing with level and trend components. Supports damped trend estimation to
              prevent overshooting when projecting medium horizons.
            </p>
          </div>

          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-brand-emerald block text-sm">5. Random Forest Regressor</span>
            <p className="text-slate-400">
              Nonlinear ensemble of decision trees trained on lagged levels, rolling volatility, and percentage return
              features. Chronologically partitioned to strictly avoid feature leakage.
            </p>
          </div>

          <div className="bg-navy-950 p-4 rounded border border-slate-800 space-y-1.5">
            <span className="font-bold text-rose-400 block text-sm">Benchmark: Naive Last-Obs</span>
            <p className="text-slate-400">
              Random-walk martingale baseline (y_t+h = y_t). Proves whether complex statistical or ML architectures
              provide statistically meaningful alpha over the efficient market hypothesis baseline.
            </p>
          </div>
        </div>
      </div>

      {/* Rigorous Evaluation Methodology */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider">
          <Scale className="w-4 h-4 text-brand-amber" />
          <span>Evaluation Methodology & Metrics</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Standard random k-fold cross-validation is categorically invalid for financial exchange rates due to temporal
          autocorrelation. FX Insight strictly enforces chronological expanding and rolling-origin backtesting. Every
          model is evaluated against identical holdout test dates, ensuring a strictly fair and statistically defensible
          comparison.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div className="bg-navy-950 p-3 rounded border border-slate-800">
            <span className="text-brand-blue font-bold block">MAE</span>
            <span className="text-slate-400 text-[11px]">Mean Absolute Error</span>
          </div>
          <div className="bg-navy-950 p-3 rounded border border-slate-800">
            <span className="text-brand-purple font-bold block">RMSE</span>
            <span className="text-slate-400 text-[11px]">Root Mean Squared Error</span>
          </div>
          <div className="bg-navy-950 p-3 rounded border border-slate-800">
            <span className="text-brand-amber font-bold block">MAPE %</span>
            <span className="text-slate-400 text-[11px]">Mean Absolute % Error</span>
          </div>
          <div className="bg-navy-950 p-3 rounded border border-slate-800">
            <span className="text-brand-teal font-bold block">Directional %</span>
            <span className="text-slate-400 text-[11px]">Correct Movement Direction</span>
          </div>
        </div>
      </div>

      {/* Known Limitations */}
      <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Known Statistical & Academic Limitations
        </h3>
        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
          <li>
            Daily foreign exchange rates are heavily driven by macro news, geopolitical developments, and interest rate
            differentials that are not captured in pure univariate time-series price histories.
          </li>
          <li>
            Reference exchange rates published by central banks reflect daily middle fixing prices rather than executable
            two-way bid/ask order book liquidity.
          </li>
          <li>
            Multi-step recursive forecasts naturally exhibit mean-reverting or variance-expanding characteristics as the
            forecast horizon H grows from 7 to 30 observations.
          </li>
        </ul>
      </div>
    </div>
  );
};

