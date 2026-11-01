import pytest
from backend.app.services.evaluation_service import evaluation_service

def test_evaluation_backtest_usd_inr():
    # Run a fast backtest on recent data slice
    res = evaluation_service.run_backtest(
        base="USD",
        quote="INR",
        horizons=[7],
        models=["linear_regression", "arima", "holt"],
        method="expanding",
        initial_train_fraction=0.80,
        start_date="2023-01-01",
        end_date="2024-03-01",
        step_stride=25
    )
    assert res.run_id.startswith("backtest_")
    assert 7 in res.results_by_horizon
    h7_res = res.results_by_horizon[7]
    assert "linear_regression" in h7_res.models
    assert h7_res.models["linear_regression"].mae > 0
    assert h7_res.best_model_by_mae in ["linear_regression", "arima", "holt"]

def test_evaluation_rankings():
    rankings = evaluation_service.get_rankings(base="USD", quote="INR", metric="mae", horizon=7)
    assert len(rankings.rankings) > 0
    assert rankings.rankings[0].rank == 1

