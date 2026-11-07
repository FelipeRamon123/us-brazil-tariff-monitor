from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import pandas as pd
import pyarrow.parquet as pq

KEEP_COLUMNS = [
    "hts10", "country", "base_rate", "total_additional", "total_rate",
    "rate_232", "rate_301", "rate_s301br", "rate_s301fl",
    "rate_ieepa_recip", "rate_ieepa_fent", "rate_s122",
    "rate_section_201", "rate_other", "revision", "valid_from", "valid_until",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Brazil rows from Yale snapshot Parquet files.")
    parser.add_argument("--archive", default="data/work/yale-release.zip")
    parser.add_argument("--output", default="data/raw/yale_brazil_rates.csv.gz")
    args = parser.parse_args()

    archive_path = Path(args.archive)
    frames = []
    with ZipFile(archive_path) as archive:
        members = sorted(
            name for name in archive.namelist()
            if "/actual/snapshots/valid_from=" in name and name.endswith("/rates.parquet")
        )
        if not members:
            raise SystemExit("No actual/snapshots/valid_from=*/rates.parquet files found in Yale release asset")
        for index, member in enumerate(members, start=1):
            table = pq.read_table(
                BytesIO(archive.read(member)), columns=KEEP_COLUMNS,
                filters=[("country", "=", "3510")],
            )
            frame = table.to_pandas()
            if not frame.empty:
                frames.append(frame)
            print(f"[{index:02d}/{len(members):02d}] {member}: {len(frame):,} Brazil rows")

    result = pd.concat(frames, ignore_index=True)
    result["hts10"] = result["hts10"].astype(str).str.zfill(10)
    result = result.drop_duplicates(["hts10", "country", "valid_from", "valid_until"], keep="last")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(output, index=False, compression="gzip")
    print(f"Wrote {len(result):,} rows across {result.valid_from.nunique()} intervals to {output}")


if __name__ == "__main__":
    main()
