# U.S. tariffs across Brazil's export basket

[Português](README.pt-BR.md)

A reproducible GitHub Pages dashboard combining monthly U.S. imports from Brazil with the statutory tariff timeline modeled by The Budget Lab at Yale.

This repository is a **showcase**. The user-facing application and processed data live here; reusable source connectors and access examples belong in the [Official Data API Toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit).

**[Open the live dashboard →](https://feliperamon123.github.io/us-brazil-tariff-monitor/)**

## Reusable code and data

- [Monthly Census query in Power Query M](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/us-census/power-query/07_monthly_imports_by_country_htsus10.m)
- [Monthly Census query in Python](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/us-census/python/07_monthly_imports_by_country_htsus10.py)
- [Monthly Census + Yale join in Python](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/yale-tariff-rate-tracker/python/03_build_monthly_tariff_exposure.py)
- [Official Portuguese nomenclature connector](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/receita-ncm)
- [Latest analytical dataset](https://github.com/FelipeRamon123/us-brazil-tariff-monitor/releases/latest/download/us-brazil-tariff-exposure.csv.gz) and [machine-readable manifest](https://github.com/FelipeRamon123/us-brazil-tariff-monitor/releases/latest/download/dataset-manifest.json)

See [docs/DATASET.md](docs/DATASET.md) for the field dictionary.

## Highlights

- Monthly consumption imports since January 2025 at HTS10 detail.
- Fully bilingual Portuguese/English interface, including charts, controls, policy milestones, product analysis, dates and value formatting.
- Main interactive chart with relative-composition and absolute-value modes, selectable tariff bands, optional policy markers and monthly value labels.
- Click any month to inspect the HS4 products driving the month-on-month change.
- 100% stacked tariff-exposure view with seven rate bands, trade-weighted average rate and month-to-month band migration.
- Source cutoffs, release metadata, row counts, duplicates and checksums retained in internal data and tests rather than displayed in the portfolio interface.
- Scheduled GitHub Actions refresh and GitHub Pages deployment.

## Setup

1. Push this directory to a GitHub repository on the `main` branch.
2. Add a repository Actions secret named `CENSUS_API_KEY`.
3. Set **Settings → Pages → Source** to **GitHub Actions**.
4. Run **Update data and deploy Pages** once manually.

Reusable connectors: [U.S. Census module](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/us-census) · [Yale Tariff Rate Tracker module](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/yale-tariff-rate-tracker)

## Review and release

Code and methodology changes are prepared on `review/*` branches and submitted as Pull Requests. `main` remains the approved version. See [docs/REVIEW_AND_RELEASE.md](docs/REVIEW_AND_RELEASE.md) for preview, approval and rollback instructions.

The weekly schedule probes the Census API for newly published months. A monthly schedule also refreshes the large Yale release asset. Both source cutoffs are stored separately so the dashboard never silently presents mismatched vintages.

## Local preview

```bash
python -m pip install -r requirements.txt
python serve.py
```

See [the API and methodology guide](docs/API_E_METODO.md) for endpoint parameters, reusable snippets and the date-alignment rule.

## Important distinction

Census calculated duties are observed monthly customs statistics. Yale rates are modeled statutory rates. They answer different questions and are intentionally displayed as separate measures.

## License and data terms

Original source code and documentation in this repository are released under the [MIT License](LICENSE). Third-party data and classifications remain subject to their respective source terms and revisions; the repository license does not relicense them.

Each refresh records Census cutoff, Yale release, join coverage and integrity checks in `data/audit.json`. Methodological changes follow the documented review, release and rollback workflow.

