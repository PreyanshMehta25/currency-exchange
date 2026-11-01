# FX INSIGHT: MULTI-CURRENCY EXCHANGE RATE FORECASTING & COMPARATIVE TIME-SERIES ANALYSIS PLATFORM

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_TypeScript-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Academic-TSDA_Project-blue.svg)](#)

FX Insight is an institutional-grade, full-stack quantitative research and time-series analysis application developed for university **Time Series Data Analysis (TSDA)**. It connects to the open-access **Frankfurter API v2** to retrieve real-time and historical daily foreign exchange reference rates, conducts rigorous exploratory data analysis (EDA), implements five distinct statistical and machine learning forecasting models, evaluates their out-of-sample accuracy via rolling-origin backtesting, and presents financial insights through a responsive quantitative dashboard.

---

## 1. Problem Statement & Research Objectives

Exchange rates fluctuate continuously under the influence of monetary policies, differential inflation, geopolitical events, trade balances, and international capital flows. These fluctuations generate severe operational uncertainty for multinational corporations, international supply chains, currency desks, and sovereign central banks.

### Core Research Objective
> *"To comparatively evaluate statistical and machine-learning-based forecasting techniques for predicting exchange-rate movements across multiple currency pairs and forecast horizons, identifying the models that provide the most accurate and consistent forecasts."*

### Research Questions
- **Pair Generalizability:** Which forecasting model performs best across different currency pairs (e.g. major pairs like EUR/USD vs emerging markets like USD/INR)?
- **Horizon Deterioration:** Does forecasting accuracy degrade significantly as the forecast horizon expands ($H = 7 \to 15 \to 30$ business days)?
- **ML vs Statistical Paradigms:** Do nonlinear machine learning approaches (Random Forest) outperform classical linear stochastic models (ARIMA, Holt's Linear)?
- **Martingale Hypothesis:** Do sophisticated forecasting models provide empirical predictive advantage over the simple Naive Last-Observation random-walk benchmark?

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS (Dark institutional quantitative theme)
- **Visualizations:** Recharts (Interactive Area, Line, Bar, and Composed charts)
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Routing:** React Router v6

### Backend
- **Framework:** Python 3.11+ / FastAPI
- **Server:** Uvicorn (ASGI)
- **Validation & Schemas:** Pydantic v2
- **Data Manipulation:** Pandas, NumPy
- **Scientific Computing & Statistics:** SciPy, Statsmodels
- **Machine Learning:** Scikit-learn, Joblib
- **Persistence:** Lightweight SQLite database (`fx_insight.db`) for run histories and metadata caching, local CSV/JSON cache files.

---

## 3. High-Level Architecture

```
tsda/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & lifecycle
│   │   ├── config.py                   # Central configuration & paths
│   │   ├── api/routes/                 # REST API endpoints
│   │   │   ├── health.py               # Health & metadata endpoints
│   │   │   ├── currencies.py           # Currency & provider routes
│   │   │   ├── rates.py                # Rates, historical data, cleaning
│   │   │   ├── analysis.py             # EDA, stationarity, decomposition
│   │   │   ├── forecasting.py          # Multi-model forecasting
│   │   │   └── evaluation.py           # Backtesting & rankings
│   │   ├── services/
│   │   │   ├── frankfurter_service.py  # External API client with exponential backoff & caching
│   │   │   ├── data_pipeline.py        # Cleaning, duplicate resolution, outlier flags
│   │   │   ├── eda_service.py          # Stats, ADF/KPSS, decomposition, ACF/PACF
│   │   │   └── evaluation_service.py   # Rolling-origin evaluation & metrics
│   │   ├── models/
│   │   │   ├── base.py                 # Abstract BaseForecaster interface
│   │   │   ├── registry.py             # Central model registry & safe execution
│   │   │   ├── linear_regression.py    # Lagged Autoregressive Model
│   │   │   ├── arima_model.py          # Auto-order ARIMA with AIC/BIC
│   │   │   ├── sarima_model.py         # Seasonal ARIMA (s=5)
│   │   │   ├── holt_model.py           # Holt's Linear & Damped Trend
│   │   │   ├── random_forest.py        # Chronological Random Forest Regressor
│   │   │   └── naive_benchmark.py      # Last-Observation Baseline
│   │   ├── schemas/                    # Pydantic request/response models
│   │   ├── utils/                      # Metrics, date math, SQLite persistence
│   │   └── tests/                      # Pytest unit & integration test suite
│   └── data/                           # Raw, processed, and cache storage
│
├── frontend/
│   ├── src/
│   │   ├── components/                 # Metric cards, currency switcher, disclaimer
│   │   ├── layouts/                    # Navigation sidebar, topbar, global currency context
│   │   ├── pages/                      # 8 Dedicated analytical views
│   │   ├── services/                   # Axios API service client
│   │   └── types/                      # TypeScript data interfaces
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                               # Comprehensive academic documentation
│   ├── methodology.md
│   ├── api_documentation.md
│   ├── dataset_documentation.md
│   └── testing_report.md
│
└── README.md
```

---

## 4. External Data Source: Frankfurter API v2

FX Insight connects to the official [Frankfurter API v2](https://api.frankfurter.dev):
- **Currencies Endpoint:** `GET /v2/currencies`
- **Providers Endpoint:** `GET /v2/providers`
- **Latest Rates Endpoint:** `GET /v2/rates?base=USD&quotes=INR,EUR,GBP,JPY`
- **Historical Rates Endpoint:** `GET /v2/rates?base=USD&quotes=INR&from=YYYY-MM-DD&to=YYYY-MM-DD`
- **Pair Lookup:** `GET /v2/rate/{base}/{quote}`

### Recommended Currency Pairs:
1. `USD/INR` (US Dollar / Indian Rupee)
2. `EUR/USD` (Euro / US Dollar)
3. `GBP/USD` (British Pound / US Dollar)
4. `USD/JPY` (US Dollar / Japanese Yen)
5. `EUR/INR` (Euro / Indian Rupee)
6. `GBP/INR` (British Pound / Indian Rupee)
7. `AUD/USD` (Australian Dollar / US Dollar)
8. `USD/CHF` (US Dollar / Swiss Franc)

### Cross-Rate Derivation:
If a requested currency pair is not published directly by the central bank provider, the platform automatically derives the rate via the common EUR anchor:
$$\text{Rate}(\text{Base} \to \text{Quote}) = \frac{\text{Rate}(\text{EUR} \to \text{Quote})}{\text{Rate}(\text{EUR} \to \text{Base})}$$
Derived cross-rates are transparently flagged as `is_derived = true`.

---

## 5. Forecasting Models & Benchmark

### 1. Autoregressive Linear Regression
Engineered features include Lags (1, 2, 3, 5, 10), rolling means (5, 10), and rolling volatility (5). Forecasts are projected through **pure recursive prediction**, updating historical feature vectors step-by-step without future lookahead. Prediction intervals expand dynamically: $\hat{y}_{t+h} \pm 1.96 \cdot \hat{\sigma}_\varepsilon \sqrt{h}$.

### 2. ARIMA (Auto p, d, q)
Uses Statsmodels `ARIMA`. Differencing order $d$ is determined via Augmented Dickey-Fuller tests. Candidate orders for $p \in [0, 3]$ and $q \in [0, 3]$ are evaluated using Akaike Information Criterion (AIC) and Bayesian Information Criterion (BIC). Multi-step forecasts generate exact analytical asymptotic confidence intervals.

### 3. SARIMA (Seasonal ARIMA)
Expands ARIMA to account for trading week business seasonality ($s = 5$). Candidate seasonal parameters $(P, D, Q)_5$ are evaluated against non-seasonal specifications to ensure that seasonal parameters are not manufactured without empirical justification.

### 4. Holt's Linear Exponential Smoothing
Uses Statsmodels `ExponentialSmoothing` with additive level and trend components. Compares standard linear trend against damped linear trend ($\phi < 1$) via Sum of Squared Errors (SSE) to prevent over-projecting trend momentum over longer horizons.

### 5. Random Forest Regressor
Nonlinear tree ensemble (150 trees, max depth 8, min samples split 5, min samples leaf 2). Features include multi-day lags, rolling means, rolling standard deviation, and lagged percentage returns. Strictly split chronologically. Prediction intervals represent the 10th and 90th percentiles across the individual decision trees.

### Benchmark: Naive Last-Observation Benchmark
Sets all future predicted values equal to the latest available training observation: $\hat{y}_{t+h} = y_t$. This tests the Efficient Market Hypothesis / Random Walk null hypothesis.

---

## 6. Evaluation Methodology & Metrics

All models are evaluated on identical, chronologically partitioned test sets. Future observations are strictly excluded from feature generation.

- **Mean Absolute Error (MAE):** $\frac{1}{n} \sum |y_t - \hat{y}_t|$
- **Root Mean Squared Error (RMSE):** $\sqrt{\frac{1}{n} \sum (y_t - \hat{y}_t)^2}$
- **Mean Absolute Percentage Error (MAPE %):** $\frac{100}{n} \sum \left|\frac{y_t - \hat{y}_t}{y_t}\right|$
- **Symmetric MAPE (sMAPE %):** $\frac{100}{n} \sum \frac{|y_t - \hat{y}_t|}{(|y_t| + |\hat{y}_t|)/2}$
- **Directional Accuracy (DA %):** $\frac{100}{n} \sum \mathbb{I}(\text{sign}(y_t - y_{t-1}) == \text{sign}(\hat{y}_t - y_{t-1}))$

### Rolling-Origin Backtesting:
Evaluates models across multiple sequential points in time using expanding or rolling windows with a configurable step stride, calculating real out-of-sample metrics for horizons $H = 7, 15, 30$ observations.

---

## 7. Frontend User Interface (8 Pages)

1. **Overview:** Pair selection, financial KPI cards (Latest Rate, 24h Change, 30d Volatility, Best Performing Model), historical rate chart with range filters (30D, 90D, 1Y, 5Y, ALL), and 7-day multi-model forecast snapshot.
2. **Currency Explorer:** Dynamic currency dropdowns from Frankfurter v2, custom date pickers, cross-currency normalized comparison (Base 100), descriptive statistics, and searchable paginated observations table.
3. **Historical Analysis:** Observation-based rolling averages (7, 30, 90), daily percentage returns chart, rolling annualized volatility chart, returns empirical distribution histogram, and 24-month average rates table.
4. **Forecasting:** Interactive forecasting terminal with customizable horizons (7, 15, 30 business days), model toggles, multi-step projection chart with uncertainty intervals, model parameters cards, observation table, and CSV export.
5. **Model Comparison:** Head-to-head comparison across all 5 models and Naive benchmark, comparative MAE and Directional Accuracy bar charts, dynamic metric leaderboard, and on-demand rolling-origin backtesting.
6. **Statistical Diagnostics:** Dual stationarity testing (ADF & KPSS) for levels vs first differences proving $I(1)$ integration, additive time-series decomposition, and ACF/PACF correlograms with 95% Bartlett confidence limits.
7. **Data Quality:** Upstream provider attribution, observation hygiene audit, missing business day analysis, outlier detection (IQR 1.5x) reporting, and manual "Force API Refresh" button.
8. **About Project:** Academic research context, TSDA viva team member section (editable and persistent in local storage), mathematical formulations, methodology, and financial disclaimer.

---

## 8. Installation & Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js v18+ and npm

---

### Step 1: Backend Setup

#### Windows PowerShell:
```powershell
# Navigate to the backend directory
cd "c:\Users\Preyansh Mehta\OneDrive\Desktop\tsda\backend"

# (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### macOS / Linux / Bash:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once launched, verify:
- Backend Health: `http://localhost:8000/api/health`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

---

### Step 2: Frontend Setup

#### In a new terminal:
```powershell
# Navigate to the frontend directory
cd "c:\Users\Preyansh Mehta\OneDrive\Desktop\tsda\frontend"

# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```

Once launched, open your web browser to:
**`http://localhost:5173`**

---

## 9. Running Tests

The test suite includes 18 automated tests across model execution, data hygiene, API contracts, and rolling-origin evaluation.

```powershell
cd "c:\Users\Preyansh Mehta\OneDrive\Desktop\tsda"
$env:PYTHONPATH = "c:\Users\Preyansh Mehta\OneDrive\Desktop\tsda"

# Run all backend unit and integration tests
pytest backend/app/tests/ -v
```

---

## 10. Financial & Academic Disclaimer

> **FX Insight** is an academic forecasting and analytical research tool created for university Time Series Data Analysis. Its outputs are statistical estimates based on historical central-bank reference rates and do not constitute financial advice, trading signals, or guaranteed future prices. Foreign exchange reference rates represent daily fixing snapshots and do not reflect executable bid/ask dealer spreads.

