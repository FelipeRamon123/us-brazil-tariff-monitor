import json
from pathlib import Path

import pandas as pd

from scripts.build_dashboard import enrich_with_yale


def test_dashboard_contract():
    data = json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))
    assert data["meta"]["country_code"] == "3510"
    assert data["monthly"][0]["period"] == "2025-01"
    assert all("imports_usd" in row for row in data["monthly"])
    assert all(event["date"] and event["authority"] for event in data["milestones"])


def test_driver_windows_are_months():
    data = json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))
    periods = {row["period"] for row in data["monthly"]}
    assert set(data["drivers"]).issubset(periods)
    assert set(data["drivers_by_level"]) == {"2", "4", "6", "8", "10"}
    for level, windows in data["drivers_by_level"].items():
        assert set(windows).issubset(periods)
        assert all(len(row["code"]) == int(level) for rows in windows.values() for row in rows)
        assert all(row["product_pt"] for rows in windows.values() for row in rows)
        assert all("tariff_components" in row for rows in windows.values() for row in rows)


def test_tariff_band_contract():
    data = json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))
    assert len(data["tariff_band_definitions"]) == 6
    assert all(">60" not in band["label"] for band in data["tariff_band_definitions"])
    assert data["tariff_band_definitions"][-1]["label"] == ">40%"
    if data["meta"].get("yale_product_join"):
        assert data["tariff_bands"]
        assert all(len(row["bands"]) == 6 for row in data["tariff_bands"])
        assert data["meta"]["monthly_reference_day"] == 15
        assert all("potentially_surcharged_pct" in row for row in data["tariff_bands"])


def test_release_dataset_contract():
    import pandas as pd

    manifest = json.loads(Path("data/processed/dataset-manifest.json").read_text(encoding="utf-8"))
    dataset = pd.read_csv("data/processed/us-brazil-tariff-exposure.csv.gz", nrows=10, dtype={"hts10": str})
    assert manifest["granularity"] == "month × country × HTSUS10"
    assert manifest["latest_period"] == json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))["meta"]["latest_period"]
    assert {"period", "hts10", "consumption_value_usd", "dutiable_value_usd", "calculated_duties_usd", "additional_rate_effective", "tariff_treatment_status", "yale_modeled_rate_reference", "yale_reference_date"}.issubset(dataset.columns)
    assert manifest["primary_rate_method"].startswith("discrete potential-surcharge classification")


def test_day_15_rule_defers_late_month_changes(tmp_path):
    imports = pd.DataFrame({
        "period": ["2025-08", "2025-09"],
        "hts10": ["0101010101", "0101010101"],
        "consumption_value_usd": [100, 100],
    })
    rates = pd.DataFrame({
        "hts10": ["0101010101", "0101010101", "0101010101"],
        "valid_from": ["2025-01-01", "2025-08-07", "2025-08-18"],
        "valid_until": ["2025-08-06", "2025-08-17", "2099-12-31"],
        "total_additional": [0.10, 0.40, 0.50],
    })
    path = tmp_path / "rates.csv"
    rates.to_csv(path, index=False)
    enriched = enrich_with_yale(imports, path).sort_values("period")
    assert enriched["yale_rate_effective"].tolist() == [0.40, 0.50]
    assert enriched["yale_rate_day_weighted"].iloc[0] != enriched["yale_rate_effective"].iloc[0]


def test_aircraft_use_share_is_not_published_as_point_rate(tmp_path):
    imports = pd.DataFrame({
        "period": ["2026-08", "2026-08"],
        "hts10": ["8802300140", "3301120000"],
        "hts10_description": ["NEW TURBOFAN AIRPLANES, NON-MILITARY", "ORANGE ESSENTIAL OIL"],
        "consumption_value_usd": [100, 100],
    })
    rates = pd.DataFrame({
        "hts10": ["8802300140", "3301120000"],
        "valid_from": ["2026-07-24", "2026-07-24"],
        "valid_until": ["2099-12-31", "2099-12-31"],
        "total_additional": [0.0375, 0.1875],
        "rate_s301br": [0.025, 0.125],
        "rate_s301fl": [0.0125, 0.0625],
    })
    path = tmp_path / "rates.csv"
    rates.to_csv(path, index=False)
    enriched = enrich_with_yale(imports, path).set_index("hts10")
    assert enriched.loc["8802300140", "yale_rate_effective"] == 0
    assert enriched.loc["8802300140", "yale_rate_modeled"] == 0.0375
    assert enriched.loc["8802300140", "tariff_treatment_status"] == "conditional_exemption"
    assert enriched.loc["3301120000", "yale_rate_effective"] == 0.375
    assert enriched.loc["3301120000", "tariff_treatment_status"] == "conditional_default_full"


def test_content_share_uses_highest_potential_band(tmp_path):
    imports = pd.DataFrame({
        "period": ["2026-08"], "hts10": ["8504230080"],
        "hts10_description": ["LIQUID DIELECTRIC TRANSFORMER"], "consumption_value_usd": [100],
    })
    rates = pd.DataFrame({
        "hts10": ["8504230080"], "valid_from": ["2026-04-06"], "valid_until": ["2099-12-31"],
        "total_additional": [0.1420784335], "rate_232": [0.1420784335],
    })
    path = tmp_path / "rates.csv"
    rates.to_csv(path, index=False)
    row = enrich_with_yale(imports, path).iloc[0]
    assert row["yale_rate_effective"] == 0.50
    assert row["tariff_rate_qualifier"] == "up_to"
    assert "até 50%" in row["tariff_treatment_note"]

