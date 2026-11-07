from __future__ import annotations

import argparse
import json
from pathlib import Path

import requests

API = "https://api.github.com/repos/Budget-Lab-Yale/tariff-rate-tracker"


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve and download the latest Yale tracker release asset.")
    parser.add_argument("--output", default="data/work/yale-release.zip")
    parser.add_argument("--metadata", default="data/raw/yale_release.json")
    args = parser.parse_args()
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "us-brazil-tariff-monitor"}
    release = requests.get(f"{API}/releases/latest", headers=headers, timeout=60).json()
    assets = release.get("assets", [])
    zip_assets = [a for a in assets if a.get("name", "").endswith(".zip")]
    if not zip_assets:
        raise SystemExit("The latest Yale GitHub release has no ZIP asset.")
    asset = max(zip_assets, key=lambda a: a.get("created_at", ""))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(asset["browser_download_url"], stream=True, timeout=600) as response:
        response.raise_for_status()
        with output.open("wb") as handle:
            for chunk in response.iter_content(1024 * 1024):
                handle.write(chunk)
    metadata = {
        "repository": f"{API.replace('api.github.com/repos', 'github.com')}",
        "tag": release["tag_name"], "published_at": release["published_at"],
        "asset": asset["name"], "asset_url": asset["browser_download_url"],
        "asset_size": asset["size"], "release_url": release["html_url"],
    }
    path = Path(args.metadata)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Downloaded Yale {metadata['tag']}: {asset['name']}")


if __name__ == "__main__":
    main()

