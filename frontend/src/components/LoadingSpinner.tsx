import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading time-series data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
      <Loader2 className="w-7 h-7 animate-spin text-brand-blue" />
      <span className="text-xs font-mono tracking-wider text-slate-300">{message}</span>
    </div>
  );
};

