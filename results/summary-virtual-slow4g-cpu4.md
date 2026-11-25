| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 67.0 kB ✓ | 105.2 kB ✓ | −36% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.4 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 14.1 kB ✓ | 14.1 kB ✓ | −0% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | +0% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 2804 (2791–2816) | 3023 (3009–3054) | −7% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 50 (46–68) | 46 (42–52) | +9% (A/A noise 5%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 619 (614–627) | 621 (613–627) | −0% (A/A noise 0%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 16 (16–18) | 12 (12–15) | +36% (A/A noise 2%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"virtual","serve":"brotli","throttle":{"latencyMs":562.5,"downKbps":1474.56,"upKbps":675,"cpuRate":4}}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 2787 (2776–2797) | 3007 (2994–3032) | −7% |
| Cold entry, detail: required content painted | chromium | 2133 (2118–2146) | 2357 (2349–2371) | −9% |
| Cold entry, detail: secondary panel painted | chromium | 2133 (2118–2146) | 2357 (2350–2371) | −9% |
| Suspense navigation: secondary panel painted | chromium | 619 (614–627) | 621 (613–627) | −0% |
| Secondary panel: data received → committed | chromium | 19 (18–25) | 15 (15–23) | +21% |
| Warm navigation: secondary panel painted | chromium | 50 (46–68) | 46 (42–52) | +9% |
| Typing: keystroke → rows committed (median key) | chromium | 9.6 (9.3–10) | 5.8 (5.3–7.8) | +67% |
| Typing: slowest keystroke → painted | chromium | 21 (19–24) | 17 (16–24) | +28% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 19 (18–22) | 23 (19–27) | −18% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 19 (18–22) | 13 (11–13) | +53% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 23 (22–26) | 19 (15–20) | +16% |
| Navigation from a small page (/about), cold: required content painted | chromium | 639 (637–650) | 641 (632–648) | −0% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 639 (637–650) | 641 (632–648) | −0% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 29 (27–34) | 24 (23–31) | +19% |

Gate: cold entry improves = true; interactions hold = false; ship Redact = false.
Failing: typePaint/chromium +36% (tolerance 5%).
