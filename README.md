# U.S.–Brazil imports under changing tariffs

[Português](README.pt-BR.md)

A reproducible GitHub Pages dashboard combining monthly U.S. imports from Brazil with the statutory tariff timeline modeled by The Budget Lab at Yale.

## Highlights

- Monthly consumption imports since January 2025 at HTS10 detail.
- Interactive timeline for Section 232, 301, 201 and 122 and IEEPA measures.
- Click any month to inspect the HS4 products driving the month-on-month change.
- 100% stacked tariff-exposure view with seven rate bands, trade-weighted average rate and month-to-month band migration.
- Source cutoff, Yale release, row counts, duplicates and checksum exposed in the UI.
- Scheduled GitHub Actions refresh and GitHub Pages deployment.

## Setup

1. Push this directory to a GitHub repository on the `main` branch.
2. Add a repository Actions secret named `CENSUS_API_KEY`.
3. Set **Settings → Pages → Source** to **GitHub Actions**.
4. Run **Update data and deploy Pages** once manually.

The weekly schedule probes the Census API for newly published months. A monthly schedule also refreshes the large Yale release asset. Both source cutoffs are stored separately so the dashboard never silently presents mismatched vintages.

## Local preview

```bash
python -m pip install -r requirements.txt
python serve.py
```

See [the API and methodology guide](docs/API_E_METODO.md) for endpoint parameters, reusable snippets and the date-alignment rule.

## Important distinction

Census calculated duties are observed monthly customs statistics. Yale rates are modeled statutory rates. They answer different questions and are intentionally displayed as separate measures.

