import React from "react";
import { ArrowRightLeft } from "lucide-react";
import { CurrencyInfo } from "../types";

interface CurrencySelectorProps {
  base: string;
  quote: string;
  onBaseChange: (base: string) => void;
  onQuoteChange: (quote: string) => void;
  currencies: CurrencyInfo[];
  recommendedPairs?: string[];
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  base,
  quote,
  onBaseChange,
  onQuoteChange,
  currencies,
  recommendedPairs = [
    "USD/INR",
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "EUR/INR",
    "GBP/INR",
    "AUD/USD",
    "USD/CHF",
  ],
}) => {
  const handleSwap = () => {
    const temp = base;
    onBaseChange(quote);
    onQuoteChange(temp);
  };

  const handlePairClick = (pair: string) => {
    const [b, q] = pair.split("/");
    onBaseChange(b);
    onQuoteChange(q);
  };

  const currentPairStr = `${base}/${quote}`;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-lg p-3 space-y-3">
      {/* Recommended Quick Select Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
          Recommended:
        </span>
        {recommendedPairs.map((p) => (
          <button
            key={p}
            onClick={() => handlePairClick(p)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              currentPairStr === p
                ? "bg-brand-blue text-navy-950 font-bold shadow-sm"
                : "bg-navy-800/80 hover:bg-slate-700 text-slate-300 border border-slate-800"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Dynamic Dropdown Selectors */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Base Currency (Unit = 1)
          </label>
          <select
            value={base}
            onChange={(e) => onBaseChange(e.target.value)}
            className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-blue"
          >
            {currencies.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                {c.iso_code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwap}
          title="Swap Currencies"
          className="mt-4 p-2 bg-navy-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Quote Currency (Priced In)
          </label>
          <select
            value={quote}
            onChange={(e) => onQuoteChange(e.target.value)}
            className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-blue"
          >
            {currencies.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                {c.iso_code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

