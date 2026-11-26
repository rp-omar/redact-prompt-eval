| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 3973 (3951–4035) | 4055 (3996–4076) | −2% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 404 (388–435) | 163 (151–200) | +148% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 962 (944–985) | 734 (718–740) | +31% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 448 (445–473) | 120 (112–150) | +273% (A/A noise 2%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"default","serve":"brotli","throttle":{"latencyMs":562.5,"downKbps":1474.56,"upKbps":675,"cpuRate":4}}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 3072 (3048–3102) | 3162 (3139–3208) | −3% |
| Cold entry, detail: required content painted | chromium | 2128 (2119–2157) | 2358 (2342–2369) | −10% |
| Cold entry, detail: secondary panel painted | chromium | 2128 (2119–2157) | 2358 (2342–2369) | −10% |
| Suspense navigation: secondary panel painted | chromium | 962 (956–985) | 734 (718–740) | +31% |
| Secondary panel: data received → committed | chromium | 363 (345–379) | 128 (116–139) | +185% |
| Warm navigation: secondary panel painted | chromium | 404 (388–435) | 163 (151–200) | +148% |
| Typing: keystroke → rows committed (median key) | chromium | 401 (395–410) | 29 (27–35) | +1273% |
| Typing: slowest keystroke → painted | chromium | 1234 (1214–1357) | 803 (778–845) | +54% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 547 (534–610) | 137 (130–188) | +299% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 547 (534–609) | 47 (46–48) | +1068% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 1046 (972–1152) | 82 (80–144) | +1180% |
| Navigation from a small page (/about), cold: required content painted | chromium | 644 (639–647) | 642 (630–644) | +0% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 644 (639–647) | 643 (630–644) | +0% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 31 (27–32) | 26 (24–27) | +19% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/chromium −2% (tolerance 5%); suspRequired/chromium +31% (tolerance 5%); typePaint/chromium +273% (tolerance 5%).
