import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Coins,
  TrendingUp,
  LineChart,
  BarChart3,
  Binary,
  CheckCircle2,
  Info,
} from "lucide-react";

const navigationItems = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Currency Explorer", path: "/explorer", icon: Coins },
  { name: "Historical Analysis", path: "/historical", icon: TrendingUp },
  { name: "Forecasting", path: "/forecasting", icon: LineChart },
  { name: "Model Comparison", path: "/comparison", icon: BarChart3 },
  { name: "Statistical Diagnostics", path: "/diagnostics", icon: Binary },
  { name: "Data Quality", path: "/quality", icon: CheckCircle2 },
  { name: "About Project", path: "/about", icon: Info },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-navy-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-brand-blue to-brand-teal flex items-center justify-center shadow-lg shadow-brand-blue/20">
            <LineChart className="w-5 h-5 text-navy-950 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-wider text-white">
              FX INSIGHT
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-brand-blue font-semibold">
              TSDA Research Terminal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-navy-900"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Terminal Metadata Footer */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono space-y-1">
        <div className="flex justify-between">
          <span>Engine:</span>
          <span className="text-slate-300">FastAPI v1.0.0</span>
        </div>
        <div className="flex justify-between">
          <span>Data Feed:</span>
          <span className="text-emerald-400">Frankfurter v2</span>
        </div>
        <div className="flex justify-between">
          <span>Environment:</span>
          <span className="text-slate-300">Academic TSDA</span>
        </div>
      </div>
    </aside>
  );
};

