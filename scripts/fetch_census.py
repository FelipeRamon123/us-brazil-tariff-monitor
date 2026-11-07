from __future__ import annotations

import argparse
import json
import os
from datetime import date
from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://api.census.gov/data/timeseries/intltrade/imports/hs"
COUNTRY_CODE = "3510"
FIELDS = [
    "I_COMMODITY", "I_COMMODITY_LDESC", "CTY_NAME",
    "GEN_VAL_MO", "CON_VAL_MO", "DUT_VAL_MO", "CAL_DUT_MO",
    "GEN_QY1_MO", "GEN_QY2_MO", "CON_QY1_MO", "CON_QY2_MO",
    "UNIT_QY1", "UNIT_QY2",
]
NUMERIC = [name for name in FIELDS if name.endswith("_MO")]


def month_range(start: str, end: str):
    current = pd.Period(start, freq="M")
    final = pd.Period(end, freq="M")
    while current <= final:
        yield current
        current += 1


def query_month(period: pd.Period, api_key: str) -> pd.DataFrame:
    params = {
        "get": ",".join(FIELDS),
        "YEAR": str(period.year),
        "MONTH": f"{period.month:02d}",
        "CTY_CODE": COUNTRY_CODE,
        "COMM_LVL": "HS10",
        "SUMMARY_LVL": "DET",
        "SUMMARY_LVL2": "HSCY",
        "key": api_key,
    }
    response = requests.get(BASE_URL, params=params, timeout=240)
    response.raise_for_status()
    if "missing_key" in response.url or not response.text.lstrip().startswith("["):
        raise RuntimeError(f"Census did not return JSON for {period}: {response.url}")
    payload = response.json()
    frame = pd.DataFrame(payload[1:], columns=payload[0])
    frame = frame[frame["I_COMMODITY"].astype(str).str.fullmatch(r"\d{10}")].copy()
    frame["I_COMMODITY"] = frame["I_COMMODITY"].astype(str).str.zfill(10)
    for column in NUMERIC:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0).astype("int64")
    frame.insert(0, "period", str(period))
    frame.insert(1, "country_code", COUNTRY_CODE)
    return frame


def latest_candidate() -> str:
    # Foreign-trade data normally lag the calendar. Probe backward in main().
    return str(pd.Period(date.today(), freq="M") - 1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download monthly U.S. imports from Brazil at HTS10.")
    parser.add_argument("--start", default="2025-01")
    parser.add_argument("--end", default=latest_candidate())
    parser.add_argument("--output", default="data/raw/census_brazil_hts10.csv.gz")
    args = parser.parse_args()

    api_key = os.getenv("CENSUS_API_KEY")
    if not api_key:
        raise SystemExit("Set CENSUS_API_KEY (GitHub repository secret or local environment variable).")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    existing = pd.read_csv(output, dtype={"hts10": str}) if output.exists() else pd.DataFrame()
    have = set(existing["period"].astype(str)) if not existing.empty else set()
    frames = []
    failures = []
    for period in month_range(args.start, args.end):
        if str(period) in have:
            continue
        try:
            frames.append(query_month(period, api_key))
            print(f"Downloaded {period}: {len(frames[-1]):,} HTS10 rows")
        except Exception as exc:  # the newest unpublished months are expected
            failures.append({"period": str(period), "error": str(exc)})
            print(f"Skipped {period}: {exc}")

    if frames:
        raw = pd.concat(frames, ignore_index=True)
        raw = raw.rename(columns={
            "I_COMMODITY": "hts10", "I_COMMODITY_LDESC": "hts10_description",
            "CTY_NAME": "country_name", "GEN_VAL_MO": "general_value_usd",
            "CON_VAL_MO": "consumption_value_usd", "DUT_VAL_MO": "dutiable_value_usd",
            "CAL_DUT_MO": "calculated_duties_usd", "GEN_QY1_MO": "general_qty1",
            "GEN_QY2_MO": "general_qty2", "CON_QY1_MO": "consumption_qty1",
            "CON_QY2_MO": "consumption_qty2", "UNIT_QY1": "unit_qty1", "UNIT_QY2": "unit_qty2",
        })
        combined = pd.concat([existing, raw], ignore_index=True) if not existing.empty else raw
        combined = combined.drop_duplicates(["period", "hts10"], keep="last").sort_values(["period", "hts10"])
        combined.to_csv(output, index=False, compression="gzip")
    elif not output.exists():
        raise SystemExit("No Census month was available and no existing cache was found.")

    meta = {
        "source": BASE_URL, "country_code": COUNTRY_CODE, "start": args.start,
        "latest_period": str(pd.read_csv(output, usecols=["period"])["period"].max()),
        "failed_probes": failures,
    }
    Path("data/raw/census_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

