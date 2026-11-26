| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 67.0 kB ✓ | 105.2 kB ✓ | −36% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.4 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 14.1 kB ✓ | 14.1 kB ✓ | −0% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | +0% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (virtualised list, first window painted), chromium, ms | 2819 (2798–2826) | 3039 (3023–3060) | −7% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 54 (49–66) | 51 (44–71) | +5% (A/A noise 2%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 625 (618–629) | 616 (611–620) | +1% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 15 (15–16) | 13 (13–15) | +15% (A/A noise 10%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"virtual","serve":"brotli","throttle":{"latencyMs":562.5,"downKbps":1474.56,"upKbps":675,"cpuRate":4}}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 2801 (2781–2806) | 3020 (3007–3041) | −7% |
| Cold entry, detail: required content painted | chromium | 2141 (2130–2148) | 2372 (2356–2414) | −10% |
| Cold entry, detail: secondary panel painted | chromium | 2141 (2130–2148) | 2372 (2356–2414) | −10% |
| Suspense navigation: secondary panel painted | chromium | 625 (618–629) | 616 (611–620) | +1% |
| Secondary panel: data received → committed | chromium | 20 (18–30) | 15 (14–17) | +32% |
| Warm navigation: secondary panel painted | chromium | 54 (49–66) | 51 (44–71) | +5% |
| Typing: keystroke → rows committed (median key) | chromium | 9.4 (8.8–9.5) | 6.5 (5.9–7.0) | +45% |
| Typing: slowest keystroke → painted | chromium | 22 (21–22) | 20 (19–20) | +10% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 18 (17–19) | 20 (19–24) | −12% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 18 (17–19) | 11 (10–12) | +58% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 24 (22–27) | 15 (12–17) | +62% |
| Navigation from a small page (/about), cold: required content painted | chromium | 641 (631–646) | 641 (639–645) | −0% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 641 (631–646) | 641 (639–645) | −0% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 28 (27–32) | 25 (24–28) | +11% |

Gate: cold entry improves = true; interactions hold = false; ship Redact = false.
Failing: typePaint/chromium +15% (tolerance 10%).
