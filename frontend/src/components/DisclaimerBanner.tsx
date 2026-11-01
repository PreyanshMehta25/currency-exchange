import React from "react";
import { ShieldAlert } from "lucide-react";

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-950/20 border-l-4 border-amber-500/60 p-3 rounded-r-lg my-3 flex items-start gap-2.5 text-xs text-amber-200/90">
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-300">Academic Research & Financial Disclaimer</p>
        <p className="text-[11px] text-amber-200/80 leading-relaxed mt-0.5">
          FX Insight is an academic forecasting and analytical tool developed for university Time Series Data Analysis (TSDA).
          Its outputs are statistical estimates based on historical reference-rate data (Frankfurter v2 / European Central Bank)
          and are not investment advice, trading signals, or guaranteed future exchange rates. Reference rates are indicative
          daily snapshots and do not represent executable market spreads.
        </p>
      </div>
    </div>
  );
};

