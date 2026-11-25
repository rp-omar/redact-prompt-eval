| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 4047 (3956–4158) | 4105 (3977–4203) | −1% (A/A noise 1%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 425 (392–467) | 173 (156–216) | +146% (A/A noise 3%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 981 (970–1005) | 730 (720–749) | +34% (A/A noise 2%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 557 (532–582) | 168 (159–181) | +231% (A/A noise 1%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"default","serve":"brotli","throttle":{"latencyMs":562.5,"downKbps":1474.56,"upKbps":675,"cpuRate":4}}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 3103 (3082–3151) | 3196 (3152–3220) | −3% |
| Cold entry, detail: required content painted | chromium | 2130 (2121–2147) | 2364 (2360–2383) | −10% |
| Cold entry, detail: secondary panel painted | chromium | 2130 (2122–2147) | 2364 (2360–2383) | −10% |
| Suspense navigation: secondary panel painted | chromium | 981 (970–1005) | 736 (720–999) | +33% |
| Secondary panel: data received → committed | chromium | 375 (364–400) | 124 (114–382) | +203% |
| Warm navigation: secondary panel painted | chromium | 425 (392–467) | 173 (156–216) | +146% |
| Typing: keystroke → rows committed (median key) | chromium | 437 (431–474) | 43 (39–47) | +926% |
| Typing: slowest keystroke → painted | chromium | 1185 (1108–1296) | 729 (682–783) | +63% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 608 (554–616) | 215 (204–239) | +182% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 608 (554–616) | 53 (50–58) | +1050% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 1019 (967–1103) | 87 (82–94) | +1070% |
| Navigation from a small page (/about), cold: required content painted | chromium | 643 (639–652) | 646 (640–647) | −0% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 643 (640–652) | 646 (640–647) | −0% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 32 (28–35) | 26 (25–33) | +23% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/chromium −1% (tolerance 5%); suspRequired/chromium +34% (tolerance 5%); typePaint/chromium +231% (tolerance 5%).
