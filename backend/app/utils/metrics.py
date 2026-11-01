import numpy as np
from typing import Dict, Union, List

def calculate_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Mean Absolute Error"""
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    if len(actual) == 0:
        return 0.0
    return float(np.mean(np.abs(actual - predicted)))

def calculate_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Root Mean Squared Error"""
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    if len(actual) == 0:
        return 0.0
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))

def calculate_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Mean Absolute Percentage Error (expressed as %).
    Handles near-zero values safely by epsilon clipping.
    """
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    if len(actual) == 0:
        return 0.0
    
    # Avoid zero division
    eps = 1e-8
    mask = np.abs(actual) > eps
    if not np.any(mask):
        return 0.0
    
    mape = np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100.0
    return float(mape)

def calculate_smape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Symmetric Mean Absolute Percentage Error (expressed as %, 0 to 200%).
    """
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    if len(actual) == 0:
        return 0.0
    
    denom = (np.abs(actual) + np.abs(predicted)) / 2.0
    eps = 1e-8
    mask = denom > eps
    if not np.any(mask):
        return 0.0
    
    smape = np.mean(np.abs(actual[mask] - predicted[mask]) / denom[mask]) * 100.0
    return float(smape)

def calculate_directional_accuracy(
    actual: np.ndarray,
    predicted: np.ndarray,
    prev_observation: float = None
) -> float:
    """
    Directional Accuracy (% of correct direction predictions).
    If prev_observation is provided (e.g. the last training observation),
    we calculate direction relative to previous actual for step 1,
    and consecutive steps thereafter.
    """
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    n = len(actual)
    if n == 0:
        return 0.0
    
    if prev_observation is not None:
        full_actual = np.insert(actual, 0, prev_observation)
        full_pred = np.insert(predicted, 0, prev_observation)
        actual_dirs = np.sign(full_actual[1:] - full_actual[:-1])
        pred_dirs = np.sign(full_pred[1:] - full_actual[:-1])
        correct = np.sum(actual_dirs == pred_dirs)
        return float((correct / n) * 100.0)
    
    if n == 1:
        return 100.0
    
    # Consecutive differences
    actual_diff = np.diff(actual)
    pred_diff = np.diff(predicted)
    correct = np.sum(np.sign(actual_diff) == np.sign(pred_diff))
    return float((correct / len(actual_diff)) * 100.0)

def calculate_all_metrics(
    actual: Union[List[float], np.ndarray],
    predicted: Union[List[float], np.ndarray],
    prev_observation: float = None
) -> Dict[str, float]:
    """Calculates all standard time-series evaluation metrics."""
    actual_arr = np.asarray(actual, dtype=float)
    pred_arr = np.asarray(predicted, dtype=float)
    
    # Check for NaN / Inf
    if not np.all(np.isfinite(actual_arr)) or not np.all(np.isfinite(pred_arr)):
        return {
            "mae": float("nan"),
            "rmse": float("nan"),
            "mape": float("nan"),
            "smape": float("nan"),
            "directional_accuracy": 0.0,
            "n_observations": len(actual_arr),
        }
    
    return {
        "mae": round(calculate_mae(actual_arr, pred_arr), 5),
        "rmse": round(calculate_rmse(actual_arr, pred_arr), 5),
        "mape": round(calculate_mape(actual_arr, pred_arr), 4),
        "smape": round(calculate_smape(actual_arr, pred_arr), 4),
        "directional_accuracy": round(
            calculate_directional_accuracy(actual_arr, pred_arr, prev_observation), 2
        ),
        "n_observations": len(actual_arr),
    }

