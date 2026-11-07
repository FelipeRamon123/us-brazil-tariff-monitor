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
