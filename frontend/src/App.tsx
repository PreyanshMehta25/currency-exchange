import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { CurrencyExplorerPage } from "./pages/CurrencyExplorerPage";
import { HistoricalAnalysisPage } from "./pages/HistoricalAnalysisPage";
import { ForecastingPage } from "./pages/ForecastingPage";
import { ModelComparisonPage } from "./pages/ModelComparisonPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { DataQualityPage } from "./pages/DataQualityPage";
import { AboutPage } from "./pages/AboutPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="explorer" element={<CurrencyExplorerPage />} />
          <Route path="historical" element={<HistoricalAnalysisPage />} />
          <Route path="forecasting" element={<ForecastingPage />} />
          <Route path="comparison" element={<ModelComparisonPage />} />
          <Route path="diagnostics" element={<DiagnosticsPage />} />
          <Route path="quality" element={<DataQualityPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

