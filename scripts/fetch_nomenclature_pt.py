from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


SOURCE_URL = "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json"
OUTPUT = Path("data/nomenclature_pt.json")


def clean_description(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value or "")
    value = re.sub(r"^\s*-{1,3}\s*", "", value)
    return value.replace("\u00a0", " ").strip()


def main() -> None:
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "us-brazil-tariff-monitor/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        source = json.load(response)

    existing = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {}
    levels = {level: dict(existing.get(level, {})) for level in ("2", "4", "6")}
    for row in source.get("Nomenclaturas", []):
        code = re.sub(r"\D", "", str(row.get("Codigo", "")))
        if len(code) in (2, 4, 6):
            levels[str(len(code))][code] = clean_description(row.get("Descricao", ""))

    payload = {
        "meta": {
            "source": SOURCE_URL,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "ncm_as_of": source.get("Data_Ultima_Atualizacao_NCM"),
            "act": source.get("Ato"),
            "note": "Official Portuguese nomenclature through HS6. HTS8 and HTS10 are U.S.-specific and use the Portuguese HS6 parent as context.",
        },
        **levels,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Saved", OUTPUT, {level: len(values) for level, values in levels.items()})


if __name__ == "__main__":
    main()
