import React, { useState, useEffect } from "react";
import { Activity, ExternalLink } from "lucide-react";
import { api } from "../services/api";

interface NavbarProps {
  currentPair: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPair }) => {
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        setIsBackendHealthy(res.status === "online");
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25) + " UTC");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-navy-900/60 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-navy-800 border border-slate-700 text-slate-200">
          Pair: <span className="text-brand-blue font-bold">{currentPair}</span>
        </span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          <span>Indicator: Daily Reference Rates</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-slate-400 hidden md:inline">
          {currentTime}
        </span>

        {/* Backend Health Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${
            isBackendHealthy === true
              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
              : isBackendHealthy === false
              ? "bg-rose-950/60 text-rose-400 border-rose-800/50"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          <Activity className="w-3 h-3 animate-pulse" />
          <span>
            {isBackendHealthy === true
              ? "Backend API: Online"
              : isBackendHealthy === false
              ? "Backend Offline"
              : "Connecting..."}
          </span>
        </div>

        {/* API Docs Button */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white bg-navy-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <span>FastAPI Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
};

