import pytest
import numpy as np
import pandas as pd

from backend.app.models.linear_regression import LinearRegressionForecaster
from backend.app.models.arima_model import ARIMAForecaster
from backend.app.models.sarima_model import SARIMAForecaster
from backend.app.models.holt_model import HoltLinearForecaster
from backend.app.models.random_forest import RandomForestForecaster
from backend.app.models.naive_benchmark import NaiveBenchmarkForecaster
from backend.app.models.registry import model_registry
from backend.app.utils.metrics import (
    calculate_mae, calculate_rmse, calculate_mape,
    calculate_smape, calculate_directional_accuracy, calculate_all_metrics
)

@pytest.fixture
def sample_series():
    # 150 simulated daily exchange rate values with random walk + drift
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=150, freq="B").strftime("%Y-%m-%d").to_series()
    drift = 0.02
    innovations = np.random.normal(0, 0.3, size=150)
    rates = 80.0 + np.cumsum(drift + innovations)
    return pd.Series(rates), dates

def test_metrics_calculation():
    actual = np.array([100.0, 102.0, 101.0, 105.0])
    predicted = np.array([101.0, 101.0, 103.0, 104.0])
    
    mae = calculate_mae(actual, predicted)
    rmse = calculate_rmse(actual, predicted)
    mape = calculate_mape(actual, predicted)
    smape = calculate_smape(actual, predicted)
    da = calculate_directional_accuracy(actual, predicted, prev_observation=99.0)
    
    assert mae > 0
    assert rmse >= mae
    assert mape > 0
    assert smape > 0
    assert 0.0 <= da <= 100.0

def test_linear_regression(sample_series):
    series, dates = sample_series
    model = LinearRegressionForecaster()
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    assert res.forecast_horizon == 7
    # Check predictions are realistic numbers around last rate
    last_val = series.iloc[-1]
    for p in res.predictions:
        assert abs(p.predicted_rate - last_val) < 15.0
        assert p.lower_bound <= p.predicted_rate <= p.upper_bound

def test_arima(sample_series):
    series, dates = sample_series
    model = ARIMAForecaster()
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    assert "p" in res.parameters
    assert "d" in res.parameters
    assert "q" in res.parameters

def test_sarima(sample_series):
    series, dates = sample_series
    model = SARIMAForecaster()
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    assert "seasonal_order" in res.parameters

def test_holt_linear(sample_series):
    series, dates = sample_series
    model = HoltLinearForecaster()
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    assert "smoothing_level_alpha" in res.parameters

def test_random_forest(sample_series):
    series, dates = sample_series
    model = RandomForestForecaster(n_estimators=30, max_depth=5)
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    assert "feature_importances" in res.parameters

def test_naive_benchmark(sample_series):
    series, dates = sample_series
    model = NaiveBenchmarkForecaster()
    model.fit(series, dates)
    res = model.predict(horizon=7)
    
    assert res.fitting_status == "success"
    assert len(res.predictions) == 7
    last_val = round(float(series.iloc[-1]), 5)
    for p in res.predictions:
        assert p.predicted_rate == last_val

def test_model_registry_run_safely(sample_series):
    series, dates = sample_series
    for m in model_registry.get_primary_models():
        res = model_registry.run_model_safely(m, series, dates, horizon=5)
        assert res.fitting_status == "success"
        assert len(res.predictions) == 5

