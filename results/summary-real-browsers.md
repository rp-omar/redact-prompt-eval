| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), firefox-release, ms | 479 (474–492) | 431 (426–528) | +11% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), safari-release, ms | 895 (855–931) | 883 (821–903) | +1% (A/A noise 3%) |
| Suspense navigation (cold click → required content painted), firefox-release, ms | 293 (272–304) | 118 (99–124) | +148% (A/A noise 8%) |
| Suspense navigation (cold click → required content painted), safari-release, ms | 140 (129–159) | 104 (93–134) | +35% (A/A noise 7%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox-release, ms | 255 (239–265) | 34 (31–35) | +649% (A/A noise 0%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), safari-release, ms | 111 (105–114) | 53 (50–56) | +107% (A/A noise 3%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: firefox-release 150.0.1, safari-release 26.5. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"default","serve":"brotli","throttle":null,"driver":"geckodriver (WebDriver), headless"}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | firefox-release | 286 (280–300) | 240 (235–314) | +19% |
| Cold entry, list: rows committed to DOM | safari-release | 275 (267–284) | 251 (241–260) | +10% |
| Suspense navigation: secondary panel painted | firefox-release | 296 (281–315) | 403 (389–413) | −27% |
| Suspense navigation: secondary panel painted | safari-release | 160 (158–171) | 402 (394–438) | −60% |
| Typing: keystroke → rows committed (median key) | firefox-release | 184 (182–212) | 16 (15–17) | +1050% |
| Typing: keystroke → rows committed (median key) | safari-release | 83 (78–89) | 22 (20–23) | +288% |
| Typing: slowest keystroke → painted | firefox-release | 615 (605–701) | 367 (364–376) | +68% |
| Typing: slowest keystroke → painted | safari-release | 501 (498–509) | 416 (409–424) | +20% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/firefox-release +11% (tolerance 5%); coldList/safari-release +1% (tolerance 5%); suspRequired/firefox-release +148% (tolerance 8%); suspRequired/safari-release +35% (tolerance 7%); typePaint/firefox-release +649% (tolerance 5%); typePaint/safari-release +107% (tolerance 5%).
