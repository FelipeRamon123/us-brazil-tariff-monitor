from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


TARIFF_BANDS = [
    ("free", "0%", -0.0000001, 0.0000001),
    ("low", ">0-10%", 0.0000001, 0.1000001),
    ("medium", ">10-15%", 0.1000001, 0.1500001),
    ("standard", ">15-25%", 0.1500001, 0.2500001),
    ("high", ">25-40%", 0.2500001, 0.4000001),
    ("very_high", ">40%", 0.4000001, float("inf")),
]


def tariff_band(rate) -> str | None:
    if pd.isna(rate):
        return None
    value = max(0.0, float(rate))
    for key, _label, lower, upper in TARIFF_BANDS:
        if lower < value <= upper or key == "free" and value <= upper:
            return key
    return "very_high"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_imports(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"hts10": str, "country_code": str})
    aliases = {
        "CON_VAL_MO": "consumption_value_usd", "GEN_VAL_MO": "general_value_usd",
        "DUT_VAL_MO": "dutiable_value_usd", "CAL_DUT_MO": "calculated_duties_usd",
    }
    df = df.rename(columns=aliases)
    required = {"period", "hts10", "hts10_description", "consumption_value_usd", "dutiable_value_usd", "calculated_duties_usd"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Census file missing columns: {sorted(missing)}")
    df["hts10"] = df["hts10"].astype(str).str.zfill(10)
    for col in ["consumption_value_usd", "dutiable_value_usd", "calculated_duties_usd"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    df["hs4"] = df["hts10"].str[:4]
    return df


def enrich_with_yale(df: pd.DataFrame, path: Path | None) -> pd.DataFrame:
    df = df.copy()
    df["yale_rate_month"] = pd.NA
    df["yale_rate_eom"] = pd.NA
    if not path or not path.exists():
        return df
    rates = pd.read_csv(path, dtype={"hts10": str, "country": str, "cty_code": str})
    if "hts10" not in rates or "total_additional" not in rates:
        raise ValueError("Yale extract must contain hts10 and total_additional")
    rates["hts10"] = rates["hts10"].astype(str).str.zfill(10)
    for column in ["valid_from", "valid_until"]:
        rates[column] = pd.to_datetime(rates[column], errors="coerce")
    rates["valid_until"] = rates["valid_until"].fillna(pd.Timestamp("2099-12-31"))
    rates["total_additional"] = pd.to_numeric(rates["total_additional"], errors="coerce").fillna(0)
    parts = []
    for period in sorted(df["period"].unique()):
        start = pd.Period(period).start_time.normalize()
        end = pd.Period(period).end_time.normalize()
        active = rates[(rates.valid_from <= end) & (rates.valid_until >= start)].copy()
        if active.empty:
            continue
        active["days"] = ((active.valid_until.clip(upper=end) - active.valid_from.clip(lower=start)).dt.days + 1).clip(lower=0)
        active["rate_days"] = active.total_additional * active.days
        monthly_sums = active.groupby("hts10", as_index=True).agg(rate_days=("rate_days", "sum"), days=("days", "sum"))
        monthly = monthly_sums.rate_days.div(monthly_sums.days).rename("yale_rate_month")
        eom = active[(active.valid_from <= end) & (active.valid_until >= end)].drop_duplicates("hts10", keep="last").set_index("hts10")["total_additional"].rename("yale_rate_eom")
        joined = monthly.to_frame().join(eom, how="left").reset_index()
        joined["period"] = period
        parts.append(joined)
    if not parts:
        return df
    lookup = pd.concat(parts, ignore_index=True)
    base = df.drop(columns=["yale_rate_month", "yale_rate_eom"])
    return base.merge(lookup, on=["period", "hts10"], how="left")


def monthly_series(df: pd.DataFrame) -> list[dict]:
    out = df.groupby("period", as_index=False).agg(
        imports_usd=("consumption_value_usd", "sum"),
        dutiable_usd=("dutiable_value_usd", "sum"),
        duties_usd=("calculated_duties_usd", "sum"),
        hts10_rows=("hts10", "nunique"),
    ).sort_values("period")
    out["change_usd"] = out["imports_usd"].diff()
    out["change_pct"] = out["imports_usd"].pct_change()
    out["observed_duty_rate"] = out["duties_usd"].div(out["imports_usd"]).fillna(0)
    out["dutiable_share"] = out["dutiable_usd"].div(out["imports_usd"]).fillna(0)
    return json.loads(out.round(6).to_json(orient="records"))


def tariff_exposure(df: pd.DataFrame) -> tuple[list[dict], dict[str, list[dict]]]:
    if not pd.to_numeric(df["yale_rate_month"], errors="coerce").notna().any():
        return [], {}
    work = df[["period", "hts10", "consumption_value_usd", "yale_rate_month"]].copy()
    work["rate"] = pd.to_numeric(work["yale_rate_month"], errors="coerce")
    work["band"] = work["rate"].map(tariff_band)
    labels = {key: label for key, label, _lo, _hi in TARIFF_BANDS}
    order = [key for key, _label, _lo, _hi in TARIFF_BANDS]
    series = []
    for period, month in work.groupby("period", sort=True):
        total = float(month.consumption_value_usd.sum())
        matched = month[month.rate.notna()]
        matched_value = float(matched.consumption_value_usd.sum())
        weighted_rate = float((matched.consumption_value_usd * matched.rate).sum() / matched_value) if matched_value else None
        bands = []
        for key in order:
            value = float(month.loc[month.band == key, "consumption_value_usd"].sum())
            bands.append({"key": key, "label": labels[key], "value_usd": value, "share_total": value / total if total else 0})
        series.append({
            "period": period, "total_usd": total, "matched_usd": matched_value,
            "coverage_pct": matched_value / total if total else 0,
            "potentially_tariffed_pct": float(month.loc[month.rate > 0, "consumption_value_usd"].sum()) / total if total else 0,
            "weighted_average_rate": weighted_rate, "bands": bands,
        })

    transitions: dict[str, list[dict]] = {}
    periods = sorted(work.period.unique())
    for before, after in zip(periods, periods[1:]):
        prev = work[work.period == before][["hts10", "rate"]].rename(columns={"rate": "rate_before"})
        curr = work[work.period == after][["hts10", "consumption_value_usd", "rate"]].rename(columns={"rate": "rate_after"})
        joined = curr.merge(prev, on="hts10", how="inner").dropna(subset=["rate_before", "rate_after"])
        joined["from"] = joined.rate_before.map(tariff_band)
        joined["to"] = joined.rate_after.map(tariff_band)
        flows = joined.groupby(["from", "to"], as_index=False).consumption_value_usd.sum()
        flows = flows[flows.consumption_value_usd > 0].sort_values("consumption_value_usd", ascending=False)
        transitions[after] = json.loads(flows.round(6).to_json(orient="records"))
    return series, transitions


def product_drivers(df: pd.DataFrame, top_n: int = 12, annotations: dict | None = None) -> dict[str, list[dict]]:
    df = df.copy()
    df["tariff_value"] = df["consumption_value_usd"] * pd.to_numeric(df["yale_rate_month"], errors="coerce").fillna(0)
    df["exposed_value"] = df["consumption_value_usd"].where(pd.to_numeric(df["yale_rate_month"], errors="coerce").fillna(0) > 0, 0)
    by = df.groupby(["period", "hs4"], as_index=False).agg(
        value_usd=("consumption_value_usd", "sum"),
        description=("hts10_description", "first"),
        tariff_value=("tariff_value", "sum"),
        exposed_value=("exposed_value", "sum"),
    )
    by["yale_rate"] = by.tariff_value.div(by.value_usd.replace(0, pd.NA))
    by["yale_exposure"] = by.exposed_value.div(by.value_usd.replace(0, pd.NA))
    periods = sorted(by["period"].unique())
    result: dict[str, list[dict]] = {}
    for before, after in zip(periods, periods[1:]):
        a = by[by.period == before].set_index("hs4")
        b = by[by.period == after].set_index("hs4")
        joined = a[["value_usd"]].rename(columns={"value_usd": "before_usd"}).join(
            b[["value_usd", "description", "yale_rate", "yale_exposure"]].rename(columns={"value_usd": "after_usd"}), how="outer"
        ).fillna({"before_usd": 0, "after_usd": 0, "description": ""})
        joined["change_usd"] = joined.after_usd - joined.before_usd
        joined["change_pct"] = joined.change_usd.div(joined.before_usd.replace(0, pd.NA))
        gross = joined.change_usd.abs().sum() or 1
        joined["gross_contribution"] = joined.change_usd.abs() / gross
        picks = pd.concat([joined.nlargest(top_n, "change_usd"), joined.nsmallest(top_n, "change_usd")]).drop_duplicates()
        picks = picks.reset_index().sort_values("change_usd", ascending=False)
        rows = json.loads(picks.round(6).to_json(orient="records"))
        for row in rows:
            if row.get("yale_rate") is not None and not pd.isna(row.get("yale_rate")):
                row.setdefault("tariff_rate", row.pop("yale_rate"))
                row.setdefault("tariff_exposure", row.pop("yale_exposure"))
                row.setdefault("tariff_regime", "Taxa adicional média mensal modelada pelo Yale")
            note = (annotations or {}).get(f"{after}|{row['hs4']}")
            if note:
                row.update(note)
        result[after] = rows
    return result


def load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--imports", default="data/raw/census_brazil_hts10.csv.gz")
    parser.add_argument("--milestones", default="data/policy_milestones.json")
    parser.add_argument("--yale", default="data/raw/yale_brazil_rates.csv.gz")
    parser.add_argument("--output", default="data/dashboard.json")
    args = parser.parse_args()
    imports_path = Path(args.imports)
    df = enrich_with_yale(normalize_imports(imports_path), Path(args.yale) if args.yale else None)
    monthly = monthly_series(df)
    tariff_bands, tariff_transitions = tariff_exposure(df)
    annotations = load_json(Path("data/driver_annotations.json"), {})
    drivers = product_drivers(df, annotations=annotations)
    yale_meta = load_json(Path("data/raw/yale_release.json"), {"status": "seeded from audited local analysis"})
    payload = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "country": "Brazil", "country_code": "3510", "first_period": monthly[0]["period"],
            "latest_period": monthly[-1]["period"], "census_sha256": sha256(imports_path),
            "census_endpoint": "https://api.census.gov/data/timeseries/intltrade/imports/hs",
            "yale": yale_meta,
            "yale_product_join": bool(pd.to_numeric(df["yale_rate_month"], errors="coerce").notna().any()),
            "method": "Census consumption imports; adjacent-month HS4 decomposition; Yale rates calendar-day weighted within each month when the product panel is available.",
        },
        "monthly": monthly,
        "tariff_bands": tariff_bands,
        "tariff_band_definitions": [{"key": key, "label": label} for key, label, _lo, _hi in TARIFF_BANDS],
        "tariff_transitions": tariff_transitions,
        "drivers": drivers,
        "milestones": load_json(Path(args.milestones), []),
        "audit": {
            "source_rows": int(len(df)), "periods": int(df.period.nunique()),
            "unique_hts10": int(df.hts10.nunique()), "duplicate_period_hts10": int(df.duplicated(["period", "hts10"]).sum()),
            "missing_description": int(df.hts10_description.isna().sum()),
            "total_imports_usd": int(df.consumption_value_usd.sum()),
            "warning": "Statutory Yale rates and observed Census duties are distinct measures; movements are descriptive, not causal estimates.",
        },
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    Path("data/audit.json").write_text(json.dumps(payload["audit"], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {output}: {len(monthly)} months, {len(drivers)} comparisons")


if __name__ == "__main__":
    main()

