import React, { useState, useEffect, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { CurrencyInfo } from "../types";
import { api } from "../services/api";

interface CurrencyContextType {
  base: string;
  quote: string;
  setBase: (b: string) => void;
  setQuote: (q: string) => void;
  currencies: CurrencyInfo[];
  recommendedPairs: string[];
}

const CurrencyContext = createContext<CurrencyContextType>({
  base: "USD",
  quote: "INR",
  setBase: () => {},
  setQuote: () => {},
  currencies: [],
  recommendedPairs: [],
});

export const useCurrency = () => useContext(CurrencyContext);

export const DashboardLayout: React.FC = () => {
  const [base, setBase] = useState<string>("USD");
  const [quote, setQuote] = useState<string>("INR");
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [recommendedPairs, setRecommendedPairs] = useState<string[]>([
    "USD/INR",
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "EUR/INR",
    "GBP/INR",
    "AUD/USD",
    "USD/CHF",
  ]);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [currList, pairsData] = await Promise.all([
          api.getCurrencies(),
          api.getSupportedPairs(),
        ]);
        setCurrencies(currList);
        if (pairsData?.recommended_pairs) {
          setRecommendedPairs(pairsData.recommended_pairs);
        }
      } catch (err) {
        console.error("Failed to load currencies metadata:", err);
      }
    };
    fetchInit();
  }, []);

  return (
    <CurrencyContext.Provider
      value={{
        base,
        quote,
        setBase,
        setQuote,
        currencies,
        recommendedPairs,
      }}
    >
      <div className="flex min-h-screen bg-navy-950 text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar currentPair={`${base}/${quote}`} />
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
            {/* <DisclaimerBanner /> */}
            <Outlet />
          </main>
        </div>
      </div>
    </CurrencyContext.Provider>
  );
};

