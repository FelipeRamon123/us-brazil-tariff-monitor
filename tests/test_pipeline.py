import json
from pathlib import Path


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


def test_release_dataset_contract():
    import pandas as pd

    manifest = json.loads(Path("data/processed/dataset-manifest.json").read_text(encoding="utf-8"))
    dataset = pd.read_csv("data/processed/us-brazil-tariff-exposure.csv.gz", nrows=10, dtype={"hts10": str})
    assert manifest["granularity"] == "month × country × HTSUS10"
    assert manifest["latest_period"] == json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))["meta"]["latest_period"]
    assert {"period", "hts10", "consumption_value_usd", "dutiable_value_usd", "calculated_duties_usd", "additional_rate_month", "additional_rate_eom"}.issubset(dataset.columns)

