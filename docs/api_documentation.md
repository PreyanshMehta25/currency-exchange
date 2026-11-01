# FX Insight — REST API Documentation

The FX Insight backend is built with FastAPI and runs on `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

## 1. System Endpoints

### `GET /api/health`
Returns backend health status, database connection state, and uptime.
- **Response `200 OK`:**
  ```json
  {
    "status": "online",
    "service": "FX Insight",
    "version": "1.0.0",
    "database": "healthy",
    "timestamp": "2026-11-02T02:00:00.000Z"
  }
  ```

### `GET /api/metadata`
Returns application capabilities, supported forecast horizons, models, and recommended currency pairs.
- **Response `200 OK`:**
  ```json
  {
    "project_name": "FX Insight",
    "version": "1.0.0",
    "supported_models": ["linear_regression", "arima", "sarima", "holt", "random_forest"],
    "supported_horizons": [7, 15, 30],
    "recommended_pairs": ["USD/INR", "EUR/USD", "GBP/USD", "USD/JPY", "EUR/INR", "GBP/INR", "AUD/USD", "USD/CHF"],
    "api_source": "Frankfurter API v2"
  }
  ```

---

## 2. Currency and Reference Rates Endpoints

### `GET /api/currencies`
Retrieves available currencies dynamically from Frankfurter v2.
- **Response `200 OK`:**
  ```json
  {
    "total": 170,
    "currencies": [
      {
        "iso_code": "USD",
        "name": "United States Dollar",
        "symbol": "$",
        "start_date": "1999-01-04",
        "end_date": "2026-10-30"
      }
    ]
  }
  ```

### `GET /api/providers`
Retrieves upstream central bank provider metadata.
- **Response `200 OK`:**
  ```json
  {
    "total": 106,
    "providers": [
      {
        "key": "ECB",
        "name": "European Central Bank",
        "rate_type": "reference rate",
        "pivot_currency": "EUR",
        "publish_cadence": "daily"
      }
    ]
  }
  ```

### `GET /api/rates/latest`
Retrieves latest available reference rate.
- **Query Parameters:**
  - `base` (str, default: `"USD"`): Base currency code.
  - `quotes` (str, optional): Comma-separated quote currency codes (e.g. `"INR,EUR,GBP"`).
- **Response `200 OK`:**
  ```json
  {
    "base": "USD",
    "rates": [
      {
        "date": "2026-11-02",
        "base": "USD",
        "quote": "INR",
        "rate": 83.45,
        "data_source": "Frankfurter v2",
        "is_derived": false
      }
    ],
    "timestamp": "2026-11-02T02:00:00Z"
  }
  ```

### `GET /api/rates/history`
Retrieves historical exchange rates for a currency pair.
- **Query Parameters:**
  - `base` (str): Base currency code.
  - `quote` (str): Quote currency code.
  - `start_date` (str, optional): `"YYYY-MM-DD"`.
  - `end_date` (str, optional): `"YYYY-MM-DD"`.
- **Response `200 OK`:**
  ```json
  {
    "base": "USD",
    "quote": "INR",
    "start_date": "2020-01-01",
    "end_date": "2026-11-02",
    "count": 1250,
    "data_source": "Frankfurter v2",
    "rates": [...]
  }
  ```

### `POST /api/data/refresh`
Forces re-fetching and cleaning of historical data from external API.
- **Request Body:**
  ```json
  {
    "base": "USD",
    "quote": "INR",
    "start_date": "2020-01-01",
    "end_date": null,
    "force_refresh": true
  }
  ```

### `GET /api/data/quality`
Returns data hygiene report, outlier counts, and missing business days.
- **Query Parameters:** `base`, `quote`, `start_date`, `end_date`.

---

## 3. Exploratory Data Analysis (EDA) Endpoints

### `GET /api/analysis/statistics`
Returns descriptive statistics for levels, first differences, and daily returns.
- **Query Parameters:** `base`, `quote`, `start_date`, `end_date`.

### `GET /api/analysis/stationarity`
Runs Augmented Dickey-Fuller (ADF) and KPSS tests on both levels and first differences.
- **Query Parameters:** `base`, `quote`.

### `GET /api/analysis/decomposition`
Computes classical time-series decomposition (Observed, Trend, Seasonal, Residual).
- **Query Parameters:** `base`, `quote`, `period` (int, default: 5), `model_type` (`"additive"`).

### `GET /api/analysis/volatility`
Calculates rolling standard deviation of daily percentage returns scaled by $\sqrt{252}$.
- **Query Parameters:** `base`, `quote`, `window` (int, default: 21), `annualize` (bool, default: true).

### `GET /api/analysis/acf-pacf`
Computes Autocorrelation Function (ACF) and Partial Autocorrelation Function (PACF) with 95% Bartlett confidence limits.
- **Query Parameters:** `base`, `quote`, `lags` (int, default: 30), `differenced` (bool, default: false).

---

## 4. Forecasting Endpoints

### `POST /api/forecast`
Generates multi-step forecasts for requested models across a specified horizon.
- **Request Body:**
  ```json
  {
    "base": "USD",
    "quote": "INR",
    "horizon": 7,
    "models": ["linear_regression", "arima", "sarima", "holt", "random_forest"],
    "start_date": "2020-01-01",
    "end_date": null
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "run_id": "fc_83a1f9e2b1",
    "base": "USD",
    "quote": "INR",
    "horizon": 7,
    "last_historical_date": "2026-10-30",
    "last_historical_rate": 83.45,
    "forecast_dates": ["2026-11-02", "2026-11-03", "2026-11-04", "..."],
    "forecasts": {
      "linear_regression": {
        "model_name": "linear_regression",
        "display_name": "Linear Regression",
        "predictions": [
          { "date": "2026-11-02", "predicted_rate": 83.47, "lower_bound": 83.15, "upper_bound": 83.79 }
        ],
        "fitting_status": "success"
      }
    },
    "naive_benchmark": { ... }
  }
  ```

### `POST /api/forecast/compare`
Runs all 5 primary models and the Naive benchmark on identical chronological data and calculates out-of-sample metrics.

---

## 5. Model Evaluation Endpoints

### `POST /api/evaluation/backtest`
Executes rolling-origin backtesting across multiple horizons ($H=7, 15, 30$).
- **Request Body:**
  ```json
  {
    "base": "USD",
    "quote": "INR",
    "horizons": [7, 15, 30],
    "models": ["linear_regression", "arima", "sarima", "holt", "random_forest"],
    "method": "expanding",
    "initial_train_fraction": 0.70,
    "step_stride": 15
  }
  ```

### `GET /api/evaluation/rankings`
Retrieves model rankings based on chosen evaluation metric and horizon.
- **Query Parameters:**
  - `base` (str, default: `"USD"`)
  - `quote` (str, default: `"INR"`)
  - `metric` (str, options: `"mae"`, `"rmse"`, `"mape"`, `"directional_accuracy"`)
  - `horizon` (int, default: 7)

