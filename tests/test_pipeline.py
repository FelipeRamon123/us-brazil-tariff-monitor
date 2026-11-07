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


def test_tariff_band_contract():
    data = json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))
    assert len(data["tariff_band_definitions"]) == 6
    assert all(">60" not in band["label"] for band in data["tariff_band_definitions"])
    assert data["tariff_band_definitions"][-1]["label"] == ">40%"
    if data["meta"].get("yale_product_join"):
        assert data["tariff_bands"]
        assert all(len(row["bands"]) == 6 for row in data["tariff_bands"])

