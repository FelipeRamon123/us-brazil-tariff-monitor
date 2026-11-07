import json
from pathlib import Path

data = json.loads(Path("data/dashboard.json").read_text(encoding="utf-8"))
periods = [row["period"] for row in data["monthly"]]
assert periods == sorted(periods) and len(periods) == len(set(periods))
assert periods[0] == "2025-01"
assert all(row["imports_usd"] >= 0 for row in data["monthly"])
assert data["audit"]["duplicate_period_hts10"] == 0
assert set(data["drivers"]).issubset(set(periods))
assert len(data["milestones"]) >= 10
if data["meta"].get("yale_product_join"):
    assert len(data["tariff_bands"]) == len(periods)
    for row in data["tariff_bands"]:
        assert 0 <= row["coverage_pct"] <= 1
        assert 0 <= row["potentially_tariffed_pct"] <= 1
        assert abs(sum(b["share_total"] for b in row["bands"]) - row["coverage_pct"]) < 1e-6
print(f"PASS: {len(periods)} months; latest={periods[-1]}; milestones={len(data['milestones'])}")

