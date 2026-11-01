import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: LucideIcon;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendValue,
  icon: Icon,
  badge,
}) => {
  return (
    <div className="bg-navy-900/80 border border-slate-800 rounded-lg p-4 shadow-sm hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            {badge}
          </span>
        )}
        {Icon && !badge && <Icon className="w-4 h-4 text-slate-400" />}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {trendValue && (
          <span
            className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
              trend === "up"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                : trend === "down"
                ? "bg-rose-950 text-rose-400 border border-rose-800/40"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {trend === "up" ? "▲ " : trend === "down" ? "▼ " : ""}
            {trendValue}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
};

