from pathlib import Path


def test_portfolio_interface_contract():
    html = Path("index.html").read_text(encoding="utf-8")
    assert 'id="auditoria"' not in html
    assert "SHA-256" not in html
    assert 'data-exposure-mode="share"' in html
    assert 'data-exposure-mode="absolute"' in html
    assert 'id="togglePolicyMarkers"' in html
    assert 'id="toggleValueLabels"' in html
    assert 'id="measureLegend"' in html
    assert 'id="showAllMeasures"' in html
    assert 'id="hideAllMeasures"' in html
    assert "Dutiable value" in html
    assert "04 / COMO LER" not in html
    assert 'data-driver-level="2"' in html
    assert 'data-driver-level="10"' in html
    assert "Sobretarifa no mês" in html
    assert "Medida e vigência" in html
    assert 'id="repoLink"' in html
    assert 'id="powerQueryLink"' in html
    assert 'id="pythonLink"' in html
    assert 'id="datasetLink"' in html
    assert 'src="assets/site-config.js"' in html
    assert 'src="assets/app.js?v=20261108-2"' in html


def test_portfolio_link_configuration():
    config = Path("assets/site-config.js").read_text(encoding="utf-8")
    assert "07_monthly_imports_by_country_htsus10.m" in config
    assert "03_build_monthly_tariff_exposure.py" in config
    assert "us-brazil-tariff-exposure.csv.gz" in config


def test_mobile_driver_bars_remain_visible():
    css = Path("assets/styles.css").read_text(encoding="utf-8")
    assert ".driver-row .bar-track{display:none}" not in css
    assert ".bar-fill{display:block" in css


def test_visual_mark_diagnostic_is_wired():
    javascript = Path("assets/app.js").read_text(encoding="utf-8")
    assert "function validateVisualMarks" in javascript
    assert "data-chart-mark" in javascript
    assert "visibleMeasures" in javascript
    assert "exposure-event-line" in javascript
    assert "exposure-event-card" in javascript
    assert "exposure-event-box" in javascript
    assert "markerDateLabel" in javascript
    assert "const hasVisibleMeasures=state.showPolicyMarkers&&state.visibleMeasures.size>0" in javascript
    assert "t:hasVisibleMeasures?340:(state.showValueLabels?48:26)" in javascript
    assert "exposure-event-dot" not in javascript
    assert "exposure-event-label" not in javascript
    assert "chart-unit-label" not in javascript
    assert "18+(i%2)*15" not in javascript
    assert "drivers_by_level" in javascript
    assert "tariff_components" in javascript


def test_language_toggle_is_functional():
    javascript = Path("assets/app.js").read_text(encoding="utf-8")
    assert "function setLanguage" in javascript
    assert 'localStorage.setItem("tariffMonitorLang"' in javascript
    assert "POLICY_EN" in javascript
    assert "GLOSSARY" in javascript
    assert 'alert("A documentação completa em inglês' not in javascript


def test_primary_metric_is_discrete_surcharge():
    html = Path("index.html").read_text(encoding="utf-8")
    javascript = Path("assets/app.js").read_text(encoding="utf-8")
    assert "alíquota adicional discreta" in html
    assert "Alíquota potencial “até”" in html
    assert "média probabilística" in html
    assert "potentially_surcharged_pct" in javascript
    assert "weighted_average_rate" not in javascript


def test_month_and_tariff_band_filters_are_available():
    html = Path("index.html").read_text(encoding="utf-8")
    javascript = Path("assets/app.js").read_text(encoding="utf-8")
    assert html.count("data-period-select") >= 2
    assert 'id="driverBandSelect"' in html
    assert "renderPeriodSelectors" in javascript
    assert "state.driverBand" in javascript
    assert html.index('id="produtos"') < html.index('id="medidas"')
    assert "03 / MEDIDAS COMERCIAIS" in html
    assert "Metodologia: Yale" not in html
