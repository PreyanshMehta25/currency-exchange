# FX Insight — Dataset & Data Preprocessing Documentation

## 1. External Data Source Overview

FX Insight sources historical and real-time reference exchange rates directly from the official **Frankfurter v2 API** (`https://api.frankfurter.dev`).

### Provider Details
- **Primary Source:** European Central Bank (ECB) Reference Rates and affiliated national central banks.
- **Publication Frequency:** Daily on TARGET2 business days (usually around 16:00 CET).
- **Authentication:** None required (Open Access).
- **Version:** Official v2 REST endpoints only.

---

## 2. Standardized Dataset Schema

Cleaned, processed datasets are stored in `backend/data/processed/{BASE}_{QUOTE}_processed.csv`.

| Field Name | Type | Description | Example |
|---|---|---|---|
| `date` | `string` (ISO 8601) | Observation date (`YYYY-MM-DD`) | `2024-01-02` |
| `base_currency` | `string` (ISO 4217) | Base currency code (Unit = 1.0) | `USD` |
| `quote_currency` | `string` (ISO 4217) | Quote currency code (Priced in) | `INR` |
| `exchange_rate` | `float` | Middle reference exchange rate | `83.2750` |
| `data_source` | `string` | Data provider attribution | `Frankfurter v2` |
| `is_derived` | `boolean` | Flag indicating cross-rate derivation | `false` |
| `is_outlier` | `boolean` | Flag indicating statistical outlier (IQR 1.5x) | `false` |

---

## 3. Directionality and Quotation Conventions

All exchange rates in FX Insight follow standard financial quotation conventions:
- **Base Currency:** The currency being priced (always unit 1.0).
- **Quote Currency:** The currency in which the price is expressed.
- **Example:** `USD/INR = 83.50` means:
  $$1.00 \text{ USD} = 83.50 \text{ INR}$$
The system strictly prevents confusion between direct (`USD/INR`) and indirect (`INR/USD`) quotations.

---

## 4. Cross-Rate Derivation Methodology

When a currency pair is requested that is not directly published as a pair by the upstream central bank, FX Insight mathematically derives the cross-rate using the European Central Bank's common pivot currency (**EUR**):

$$\text{Rate}(\text{BASE} \to \text{QUOTE}) = \frac{\text{Rate}(\text{EUR} \to \text{QUOTE})}{\text{Rate}(\text{EUR} \to \text{BASE})}$$

### Constraints Enforced:
1. Both `EUR/BASE` and `EUR/QUOTE` must exist on the exact same observation date $t$.
2. The denominator $\text{Rate}(\text{EUR} \to \text{BASE})$ must be strictly positive.
3. Derived rates are transparently marked with `is_derived = true` and `data_source = "Frankfurter v2 (EUR Cross-Derived)"`.

---

## 5. Cleaning and Data Hygiene Pipeline

The automated preprocessing pipeline in `backend/app/services/data_pipeline.py` executes the following steps:

1. **Duplicate Resolution:** Identifies duplicate dates in raw responses and retains the first verified observation.
2. **Type Validation:** Coerces rate strings to 64-bit floating point numbers; drops invalid, null, negative, or zero values.
3. **Chronological Sorting:** Enforces strict ascending date order ($t_0 < t_1 < \dots < t_N$).
4. **Trading Day Validation vs Artificial Imputation:**
   - Real-world foreign exchange reference rates are published on business days only.
   - **Important:** Weekends and bank holidays are *not* filled with artificial interpolations or forward-fills, which would falsify volatility and create artificial zero-return observations.
   - The platform calculates the expected business days and categorizes discrepancies as non-trading calendar closures.
5. **Statistical Outlier Detection (IQR 1.5x):**
   - Lower Bound = $Q_1 - 1.5 \times \text{IQR}$
   - Upper Bound = $Q_3 + 1.5 \times \text{IQR}$
   - Outliers are identified and flagged in the data quality audit, but are **not** arbitrarily removed from training. Sudden currency shocks (e.g., central bank interventions, devaluations, geopolitical events) represent genuine economic reality that models must learn to accommodate.

