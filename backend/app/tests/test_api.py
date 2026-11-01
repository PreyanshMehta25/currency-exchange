import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert data["database"] == "healthy"

def test_metadata():
    response = client.get("/api/metadata")
    assert response.status_code == 200
    data = response.json()
    assert len(data["supported_models"]) == 5
    assert 7 in data["supported_horizons"]

def test_currencies():
    response = client.get("/api/currencies")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert any(c["iso_code"] == "USD" for c in data["currencies"])
    assert any(c["iso_code"] == "INR" for c in data["currencies"])

def test_rates_pairs():
    response = client.get("/api/rates/pairs")
    assert response.status_code == 200
    data = response.json()
    assert "USD/INR" in data["recommended_pairs"]

def test_historical_rates_and_quality():
    # Use 3 months historical data for quick test
    response = client.get("/api/rates/history?base=USD&quote=INR&start_date=2024-01-01&end_date=2024-03-31")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] > 30
    assert data["base"] == "USD"
    assert data["quote"] == "INR"
    assert data["rates"][0]["rate"] > 0

    # Data quality report
    q_resp = client.get("/api/data/quality?base=USD&quote=INR&start_date=2024-01-01&end_date=2024-03-31")
    assert q_resp.status_code == 200
    q_data = q_resp.json()
    assert q_data["total_observations"] > 30
    assert q_data["mean_rate"] > 0

def test_eda_statistics():
    response = client.get("/api/analysis/statistics?base=USD&quote=INR&start_date=2024-01-01&end_date=2024-03-31")
    assert response.status_code == 200
    data = response.json()
    assert "levels_stats" in data
    assert "returns_stats" in data
    assert data["levels_stats"]["mean"] > 0

def test_eda_stationarity():
    response = client.get("/api/analysis/stationarity?base=USD&quote=INR&start_date=2024-01-01&end_date=2024-03-31")
    assert response.status_code == 200
    data = response.json()
    assert "levels_adf" in data
    assert "differenced_adf" in data
    assert "overall_conclusion" in data

def test_forecast_endpoint():
    payload = {
        "base": "USD",
        "quote": "INR",
        "horizon": 7,
        "models": ["linear_regression", "arima", "holt"],
        "start_date": "2024-01-01",
        "end_date": "2024-03-31"
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["horizon"] == 7
    assert len(data["forecast_dates"]) == 7
    assert "linear_regression" in data["forecasts"]
    assert "arima" in data["forecasts"]
    assert len(data["forecasts"]["linear_regression"]["predictions"]) == 7

