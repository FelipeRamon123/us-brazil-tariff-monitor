from __future__ import annotations

import argparse
import hashlib
import json
from itertools import combinations
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

TARIFF_COMPONENTS = {
    "rate_232": "Seção 232",
    "rate_s301br": "Seção 301 Brasil",
    "rate_s301fl": "Seção 301 trabalho forçado",
    "rate_ieepa_recip": "IEEPA recíproca",
    "rate_ieepa_fent": "IEEPA fentanil",
    "rate_s122": "Seção 122",
    "rate_section_201": "Seção 201",
    "rate_301": "Seção 301",
    "rate_other": "Outras medidas",
}

DRIVER_LEVELS = (2, 4, 6, 8, 10)
MONTHLY_REFERENCE_DAY = 15


def applicable_components(candidates: list[dict], target_rate: float | None) -> list[dict]:
    target = float(target_rate or 0)
    if target <= 0 or not candidates:
        return []
    best: tuple[tuple[float, int, int], list[dict]] | None = None
    for size in range(1, len(candidates) + 1):
        for indexes in combinations(range(len(candidates)), size):
            chosen = [candidates[index] for index in indexes]
            score = (abs(sum(item["rate"] for item in chosen) - target), size, sum(indexes))
            if best is None or score < best[0]:
                best = (score, chosen)
    return best[1] if best else []


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
    for level in DRIVER_LEVELS:
        df[f"code_{level}"] = df["hts10"].str[:level]
    df["hs4"] = df["code_4"]
    return df


def enrich_with_yale(df: pd.DataFrame, path: Path | None) -> pd.DataFrame:
    df = df.copy()
    df["yale_rate_effective"] = pd.NA
    df["yale_rate_day_weighted"] = pd.NA
    df["yale_rate_eom"] = pd.NA
    df["yale_reference_date"] = pd.NA
    df["yale_valid_from"] = pd.NA
    for component in TARIFF_COMPONENTS:
        df[f"yale_{component}"] = pd.NA
        df[f"yale_{component}_since"] = pd.NA
    if not path or not path.exists():
        return df
    rates = pd.read_csv(path, dtype={"hts10": str, "country": str, "cty_code": str})
    if "hts10" not in rates or "total_additional" not in rates:
        raise ValueError("Yale extract must contain hts10 and total_additional")
    rates["hts10"] = rates["hts10"].astype(str).str.zfill(10)
    for column in ["valid_from", "valid_until"]:
        rates[column] = pd.to_datetime(rates[column], errors="coerce")
    rates["valid_until"] = rates["valid_until"].fillna(pd.Timestamp("2099-12-31"))
    numeric_rates = ["total_additional", *TARIFF_COMPONENTS]
    for column in numeric_rates:
        if column not in rates:
            rates[column] = 0
        rates[column] = pd.to_numeric(rates[column], errors="coerce").fillna(0)
    rates = rates.sort_values(["hts10", "valid_from", "valid_until"]).reset_index(drop=True)
    for component in TARIFF_COMPONENTS:
        changed = rates.groupby("hts10")[component].diff().fillna(float("inf")).ne(0)
        since = rates["valid_from"].where(changed)
        rates[f"{component}_since"] = since.groupby(rates["hts10"]).ffill()
    parts = []
    for period in sorted(df["period"].unique()):
        start = pd.Period(period).start_time.normalize()
        end = pd.Period(period).end_time.normalize()
        reference = start + pd.Timedelta(days=MONTHLY_REFERENCE_DAY - 1)
        active = rates[(rates.valid_from <= end) & (rates.valid_until >= start)].copy()
        if active.empty:
            continue
        active["days"] = ((active.valid_until.clip(upper=end) - active.valid_from.clip(lower=start)).dt.days + 1).clip(lower=0)
        active["rate_days"] = active.total_additional * active.days
        monthly_sums = active.groupby("hts10", as_index=True).agg(rate_days=("rate_days", "sum"), days=("days", "sum"))
        day_weighted = monthly_sums.rate_days.div(monthly_sums.days).rename("yale_rate_day_weighted")
        snapshot_columns = ["hts10", "total_additional", "valid_from"]
        snapshot_columns += list(TARIFF_COMPONENTS)
        snapshot_columns += [f"{component}_since" for component in TARIFF_COMPONENTS]
        snapshot = rates[(rates.valid_from <= reference) & (rates.valid_until >= reference)].sort_values(["hts10", "valid_from"]).drop_duplicates("hts10", keep="last")[snapshot_columns].set_index("hts10")
        snapshot = snapshot.rename(columns={
            "total_additional": "yale_rate_effective",
            "valid_from": "yale_valid_from",
            **{component: f"yale_{component}" for component in TARIFF_COMPONENTS},
            **{f"{component}_since": f"yale_{component}_since" for component in TARIFF_COMPONENTS},
        })
        eom = rates[(rates.valid_from <= end) & (rates.valid_until >= end)].sort_values(["hts10", "valid_from"]).drop_duplicates("hts10", keep="last")[["hts10", "total_additional"]].set_index("hts10").rename(columns={"total_additional": "yale_rate_eom"})
        joined = snapshot.join(day_weighted, how="outer").join(eom, how="outer").reset_index()
        joined["period"] = period
        joined["yale_reference_date"] = reference
        parts.append(joined)
    if not parts:
        return df
    lookup = pd.concat(parts, ignore_index=True)
    yale_columns = ["yale_rate_effective", "yale_rate_day_weighted", "yale_rate_eom", "yale_reference_date", "yale_valid_from"]
    yale_columns += [f"yale_{component}" for component in TARIFF_COMPONENTS]
    yale_columns += [f"yale_{component}_since" for component in TARIFF_COMPONENTS]
    base = df.drop(columns=yale_columns, errors="ignore")
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


def export_public_dataset(df: pd.DataFrame, output: Path, manifest_path: Path, source_path: Path, yale_meta: dict) -> None:
    """Write the reusable month × HTSUS10 analytical table and its machine-readable manifest."""
    public = df.copy()
    public["additional_rate_effective"] = pd.to_numeric(public["yale_rate_effective"], errors="coerce")
    public["additional_rate_day_weighted"] = pd.to_numeric(public["yale_rate_day_weighted"], errors="coerce")
    public["additional_rate_eom"] = pd.to_numeric(public["yale_rate_eom"], errors="coerce")
    public["tariff_band"] = public["additional_rate_effective"].map(tariff_band)
    rename = {
        "hts10_description": "description_en",
        **{f"yale_{component}": component for component in TARIFF_COMPONENTS},
        **{f"yale_{component}_since": f"{component}_since" for component in TARIFF_COMPONENTS},
    }
    public = public.rename(columns=rename)
    preferred = [
        "period", "country_code", "country_name", "hts10", "description_en",
        "general_value_usd", "consumption_value_usd", "dutiable_value_usd", "calculated_duties_usd",
        "general_qty1", "general_qty2", "consumption_qty1", "consumption_qty2", "unit_qty1", "unit_qty2",
        "additional_rate_effective", "additional_rate_day_weighted", "additional_rate_eom",
        "tariff_band", "yale_reference_date", "yale_valid_from",
        *TARIFF_COMPONENTS.keys(), *[f"{component}_since" for component in TARIFF_COMPONENTS],
    ]
    for column in preferred:
        if column not in public:
            public[column] = pd.NA
    output.parent.mkdir(parents=True, exist_ok=True)
    public[preferred].sort_values(["period", "hts10"]).to_csv(output, index=False, compression="gzip")
    manifest = {
        "dataset": output.name,
        "granularity": "month × country × HTSUS10",
        "country_code": "3510",
        "first_period": str(public["period"].min()),
        "latest_period": str(public["period"].max()),
        "rows": int(len(public)),
        "unique_htsus10": int(public["hts10"].nunique()),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "census": {"endpoint": "https://api.census.gov/data/timeseries/intltrade/imports/hs", "sha256": sha256(source_path)},
        "yale": yale_meta,
        "primary_rate_method": f"total_additional in force on calendar day {MONTHLY_REFERENCE_DAY} of each month; measures beginning after that date enter in the following month",
        "auxiliary_rate_method": "additional_rate_day_weighted weights total_additional by calendar days in force within the month; it does not determine dashboard bands",
        "value_basis": "U.S. imports for consumption (CON_VAL_MO)",
        "license_note": "Repository code is MIT licensed; source data remain subject to their original terms.",
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def tariff_exposure(df: pd.DataFrame) -> tuple[list[dict], dict[str, list[dict]]]:
    if not pd.to_numeric(df["yale_rate_effective"], errors="coerce").notna().any():
        return [], {}
    work = df[["period", "hts10", "consumption_value_usd", "yale_rate_effective"]].copy()
    work["rate"] = pd.to_numeric(work["yale_rate_effective"], errors="coerce")
    work["band"] = work["rate"].map(tariff_band)
    labels = {key: label for key, label, _lo, _hi in TARIFF_BANDS}
    order = [key for key, _label, _lo, _hi in TARIFF_BANDS]
    series = []
    for period, month in work.groupby("period", sort=True):
        total = float(month.consumption_value_usd.sum())
        matched = month[month.rate.notna()]
        matched_value = float(matched.consumption_value_usd.sum())
        bands = []
        for key in order:
            value = float(month.loc[month.band == key, "consumption_value_usd"].sum())
            bands.append({"key": key, "label": labels[key], "value_usd": value, "share_total": value / total if total else 0})
        nonzero_bands = [band for band in bands if band["key"] != "free"]
        dominant = max(nonzero_bands, key=lambda item: item["value_usd"], default=None)
        series.append({
            "period": period, "total_usd": total, "matched_usd": matched_value,
            "coverage_pct": matched_value / total if total else 0,
            "potentially_surcharged_pct": float(month.loc[month.rate > 0, "consumption_value_usd"].sum()) / total if total else 0,
            "dominant_surcharge_band": dominant["label"] if dominant and dominant["value_usd"] > 0 else "0%",
            "dominant_surcharge_share": dominant["share_total"] if dominant and dominant["value_usd"] > 0 else 0,
            "bands": bands,
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


def product_drivers(
    df: pd.DataFrame,
    top_n: int = 12,
    annotations: dict | None = None,
    nomenclature: dict | None = None,
) -> dict[str, dict[str, list[dict]]]:
    base = df.copy()
    value = base["consumption_value_usd"]
    rate_effective = pd.to_numeric(base["yale_rate_effective"], errors="coerce")
    rate_day_weighted = pd.to_numeric(base["yale_rate_day_weighted"], errors="coerce")
    rate_eom = pd.to_numeric(base["yale_rate_eom"], errors="coerce").fillna(0)
    base["tariff_value_effective"] = value * rate_effective.fillna(0)
    base["tariff_value_day_weighted"] = value * rate_day_weighted.fillna(0)
    base["tariff_value_eom"] = value * rate_eom
    base["exposed_value"] = value.where(rate_effective > 0, 0)

    pt = nomenclature or {}
    result: dict[str, dict[str, list[dict]]] = {}
    for level in DRIVER_LEVELS:
        code_col = f"code_{level}"
        sums = {
            "consumption_value_usd": ("consumption_value_usd", "sum"),
            "tariff_value_effective": ("tariff_value_effective", "sum"),
            "tariff_value_day_weighted": ("tariff_value_day_weighted", "sum"),
            "tariff_value_eom": ("tariff_value_eom", "sum"),
            "exposed_value": ("exposed_value", "sum"),
        }
        grouped = base.groupby(["period", code_col], as_index=False).agg(**sums).rename(columns={code_col: "code"})
        grouped["tariff_rate_trade_weighted"] = grouped.tariff_value_effective.div(grouped.consumption_value_usd).fillna(0)
        grouped["tariff_rate_day_weighted"] = grouped.tariff_value_day_weighted.div(grouped.consumption_value_usd).fillna(0)
        grouped["tariff_rate_eom"] = grouped.tariff_value_eom.div(grouped.consumption_value_usd).fillna(0)
        grouped["tariff_exposure"] = grouped.exposed_value.div(grouped.consumption_value_usd).fillna(0)

        positive = base[base.consumption_value_usd > 0].copy()
        positive["code"] = positive[code_col]
        positive["numeric_rate_effective"] = pd.to_numeric(positive["yale_rate_effective"], errors="coerce")
        ranges = positive.groupby(["period", "code"], as_index=False).agg(
            tariff_rate_min=("numeric_rate_effective", "min"), tariff_rate_max=("numeric_rate_effective", "max")
        )
        rate_values = positive.dropna(subset=["numeric_rate_effective"]).groupby(
            ["period", "code", "numeric_rate_effective"], as_index=False
        ).consumption_value_usd.sum()
        dominant = rate_values.sort_values(
            ["period", "code", "consumption_value_usd", "numeric_rate_effective"],
            ascending=[True, True, False, False],
        ).drop_duplicates(["period", "code"]).rename(columns={"numeric_rate_effective": "tariff_rate"})
        dominant = dominant[["period", "code", "tariff_rate"]]
        representatives = positive.merge(
            dominant, left_on=["period", "code", "numeric_rate_effective"],
            right_on=["period", "code", "tariff_rate"], how="inner",
        ).sort_values("consumption_value_usd", ascending=False).drop_duplicates(["period", "code"])
        representative_columns = ["period", "code", "hts10", "hts10_description"]
        representative_columns += [f"yale_{component}" for component in TARIFF_COMPONENTS]
        representative_columns += [f"yale_{component}_since" for component in TARIFF_COMPONENTS]
        representatives = representatives[representative_columns].rename(columns={
            "hts10": "leader_hts10", "hts10_description": "description",
            **{f"yale_{component}": f"rep_{component}" for component in TARIFF_COMPONENTS},
            **{f"yale_{component}_since": f"rep_{component}_since" for component in TARIFF_COMPONENTS},
        })
        grouped = grouped.merge(dominant, on=["period", "code"], how="left")
        grouped = grouped.merge(ranges, on=["period", "code"], how="left").merge(representatives, on=["period", "code"], how="left")

        by_period: dict[str, list[dict]] = {}
        periods = sorted(grouped.period.unique())
        for before, after in zip(periods, periods[1:]):
            a = grouped[grouped.period == before].set_index("code")
            b = grouped[grouped.period == after].set_index("code")
            before_columns = ["consumption_value_usd", "description", "leader_hts10"]
            after_columns = [
                "consumption_value_usd", "description", "leader_hts10", "tariff_rate", "tariff_rate_eom",
                "tariff_rate_trade_weighted", "tariff_rate_day_weighted", "tariff_exposure",
                "tariff_rate_min", "tariff_rate_max",
                *[f"rep_{component}" for component in TARIFF_COMPONENTS],
                *[f"rep_{component}_since" for component in TARIFF_COMPONENTS],
            ]
            joined = a[before_columns].rename(columns={
                "consumption_value_usd": "before_usd", "description": "description_before", "leader_hts10": "leader_before"
            }).join(b[after_columns].rename(columns={
                "consumption_value_usd": "after_usd", "description": "description_after", "leader_hts10": "leader_after"
            }), how="outer")
            joined["before_usd"] = joined.before_usd.fillna(0)
            joined["after_usd"] = joined.after_usd.fillna(0)
            joined["description"] = joined.description_after.fillna(joined.description_before).fillna("")
            joined["leader_hts10"] = joined.leader_after.fillna(joined.leader_before).fillna("")
            joined["change_usd"] = joined.after_usd - joined.before_usd
            joined["change_pct"] = joined.change_usd.div(joined.before_usd.replace(0, pd.NA))
            gross = joined.change_usd.abs().sum() or 1
            joined["gross_contribution"] = joined.change_usd.abs() / gross
            picks = pd.concat([joined.nlargest(top_n, "change_usd"), joined.nsmallest(top_n, "change_usd")]).drop_duplicates()
            picks = picks.reset_index().sort_values("change_usd", ascending=False)
            numeric_columns = picks.select_dtypes(include="number").columns
            picks[numeric_columns] = picks[numeric_columns].round(10)
            rows = json.loads(picks.to_json(orient="records", date_format="iso"))
            for row in rows:
                code = str(row["code"]).zfill(level)
                pt_level = str(level if level <= 6 else 6)
                pt_code = code[: int(pt_level)]
                row["level"] = level
                row["code"] = code
                row["product_pt"] = pt.get(pt_level, {}).get(pt_code) or row.get("description") or code
                row["description_en"] = row.pop("description", "")
                component_candidates = []
                for component, label in TARIFF_COMPONENTS.items():
                    component_rate = row.pop(f"rep_{component}", None)
                    since = row.pop(f"rep_{component}_since", None)
                    if component_rate is not None and component_rate > 0.000001:
                        component_candidates.append({
                            "key": component, "label": label, "rate": component_rate,
                            "since": str(since)[:10] if since else None,
                        })
                components = applicable_components(component_candidates, row.get("tariff_rate"))
                row["tariff_components"] = components
                row["tariff_measure"] = " + ".join(item["label"] for item in components) if components else "Sem sobretarifa modelada"
                row["tariff_since"] = components[0]["since"] if components else None
                row["tariff_regime"] = (
                    "Sobretarifa potencial efetiva no HTSUS10 pela regra do dia 15"
                    if level == 10 else
                    "Faixa de sobretarifa potencial predominante entre os HTSUS10 do código pela regra do dia 15"
                )
                for unused in ["description_before", "description_after", "leader_before", "leader_after"]:
                    row.pop(unused, None)
                if level == 4:
                    row["hs4"] = code
                    note = (annotations or {}).get(f"{after}|{code}")
                    if note:
                        row.update(note)
                row["product_pt"] = pt.get(pt_level, {}).get(pt_code) or row.get("product_pt") or code
            by_period[after] = rows
        result[str(level)] = by_period
    return result


def load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--imports", default="data/raw/census_brazil_hts10.csv.gz")
    parser.add_argument("--milestones", default="data/policy_milestones.json")
    parser.add_argument("--yale", default="data/raw/yale_brazil_rates.csv.gz")
    parser.add_argument("--output", default="data/dashboard.json")
    parser.add_argument("--dataset", default="data/processed/us-brazil-tariff-exposure.csv.gz")
    parser.add_argument("--manifest", default="data/processed/dataset-manifest.json")
    args = parser.parse_args()
    imports_path = Path(args.imports)
    df = enrich_with_yale(normalize_imports(imports_path), Path(args.yale) if args.yale else None)
    monthly = monthly_series(df)
    tariff_bands, tariff_transitions = tariff_exposure(df)
    annotations = load_json(Path("data/driver_annotations.json"), {})
    nomenclature = load_json(Path("data/nomenclature_pt.json"), {})
    drivers_by_level = product_drivers(df, annotations=annotations, nomenclature=nomenclature)
    drivers = drivers_by_level["4"]
    yale_meta = load_json(Path("data/raw/yale_release.json"), {"status": "seeded from audited local analysis"})
    export_public_dataset(df, Path(args.dataset), Path(args.manifest), imports_path, yale_meta)
    payload = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "country": "Brazil", "country_code": "3510", "first_period": monthly[0]["period"],
            "latest_period": monthly[-1]["period"], "census_sha256": sha256(imports_path),
            "census_endpoint": "https://api.census.gov/data/timeseries/intltrade/imports/hs",
            "yale": yale_meta,
            "yale_product_join": bool(pd.to_numeric(df["yale_rate_effective"], errors="coerce").notna().any()),
            "method": f"Census consumption imports; adjacent-month HS2/4/6/8/10 decomposition; Yale statutory additional rate in force on day {MONTHLY_REFERENCE_DAY} of each month. Day-weighted rate retained only as an auxiliary field.",
            "monthly_reference_day": MONTHLY_REFERENCE_DAY,
            "nomenclature_pt": nomenclature.get("meta", {}),
        },
        "monthly": monthly,
        "tariff_bands": tariff_bands,
        "tariff_band_definitions": [{"key": key, "label": label} for key, label, _lo, _hi in TARIFF_BANDS],
        "tariff_transitions": tariff_transitions,
        "drivers": drivers,
        "drivers_by_level": drivers_by_level,
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

