| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 67.0 kB ✓ | 105.2 kB ✓ | −36% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.4 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 14.1 kB ✓ | 14.1 kB ✓ | −0% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | +0% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (virtualised list, first window painted), chromium, ms | 74 (73–75) | 79 (79–101) | −7% (A/A noise 0%) |
| Cold entry → usable content (virtualised list, first window painted), firefox, ms | 87 (83–94) | 92 (91–94) | −5% (A/A noise 3%) |
| Cold entry → usable content (virtualised list, first window painted), webkit, ms | 79 (77–82) | 82 (80–90) | −4% (A/A noise 1%) |
| Cold entry → usable content (virtualised list, first window painted), chrome, ms | 75 (73–77) | 82 (80–89) | −9% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 38 (31–44) | 39 (31–42) | −4% (A/A noise 1%) |
| Warm navigation → visible content (preloaded, click → painted), firefox, ms | 14 (9.0–22) | 16 (10–19) | −13% (A/A noise 19%) |
| Warm navigation → visible content (preloaded, click → painted), webkit, ms | 15 (11–17) | 12 (7.0–14) | +25% (A/A noise 8%) |
| Warm navigation → visible content (preloaded, click → painted), chrome, ms | 43 (37–54) | 43 (32–53) | +0% (A/A noise 5%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 58 (48–65) | 65 (63–67) | −11% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), firefox, ms | 59 (52–66) | 59 (55–67) | +0% (A/A noise 5%) |
| Suspense navigation (cold click → required content painted), webkit, ms | 64 (60–69) | 63 (54–66) | +2% (A/A noise 0%) |
| Suspense navigation (cold click → required content painted), chrome, ms | 65 (62–66) | 61 (49–66) | +6% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 8.1 (7.0–9.7) | 6.8 (5.5–8.2) | +19% (A/A noise 7%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox, ms | 8.0 (7.5–9.0) | 6.0 (4.0–7.5) | +33% (A/A noise 0%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), webkit, ms | 9.5 (7.0–10) | 8.5 (8.0–9.0) | +12% (A/A noise 6%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chrome, ms | 7.4 (5.7–9.1) | 6.3 (3.4–6.7) | +18% (A/A noise 20%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6, firefox 159.0, webkit 27.2, chrome 158.0.8127.37. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"virtual","serve":"brotli","throttle":null}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 69 (69–71) | 76 (75–97) | −8% |
| Cold entry, list: rows committed to DOM | firefox | 77 (74–81) | 83 (83–85) | −7% |
| Cold entry, list: rows committed to DOM | webkit | 72 (71–75) | 76 (74–82) | −5% |
| Cold entry, list: rows committed to DOM | chrome | 71 (69–72) | 78 (77–85) | −9% |
| Cold entry, detail: required content painted | chromium | 74 (73–74) | 76 (75–78) | −3% |
| Cold entry, detail: required content painted | firefox | 87 (82–92) | 95 (92–101) | −8% |
| Cold entry, detail: required content painted | webkit | 75 (73–79) | 84 (79–89) | −11% |
| Cold entry, detail: required content painted | chrome | 79 (75–82) | 79 (78–91) | −0% |
| Cold entry, detail: secondary panel painted | chromium | 188 (171–188) | 390 (388–391) | −52% |
| Cold entry, detail: secondary panel painted | firefox | 189 (185–194) | 393 (382–397) | −52% |
| Cold entry, detail: secondary panel painted | webkit | 181 (180–189) | 386 (386–393) | −53% |
| Cold entry, detail: secondary panel painted | chrome | 176 (175–189) | 381 (376–393) | −54% |
| Suspense navigation: secondary panel painted | chromium | 164 (162–166) | 364 (363–366) | −55% |
| Suspense navigation: secondary panel painted | firefox | 169 (160–173) | 363 (360–370) | −53% |
| Suspense navigation: secondary panel painted | webkit | 171 (166–176) | 368 (360–375) | −54% |
| Suspense navigation: secondary panel painted | chrome | 164 (162–166) | 363 (352–367) | −55% |
| Secondary panel: data received → committed | chromium | 1.6 (0.8–3.2) | 197 (194–199) | −99% |
| Secondary panel: data received → committed | firefox | 2.0 (1.0–6.0) | 195 (193–198) | −99% |
| Secondary panel: data received → committed | webkit | 5.0 (4.0–9.0) | 200 (195–202) | −98% |
| Secondary panel: data received → committed | chrome | 3.0 (1.2–3.5) | 196 (194–198) | −98% |
| Warm navigation: secondary panel painted | chromium | 38 (31–44) | 39 (31–42) | −4% |
| Warm navigation: secondary panel painted | firefox | 14 (9.0–22) | 16 (10–19) | −13% |
| Warm navigation: secondary panel painted | webkit | 15 (11–17) | 13 (7.0–14) | +15% |
| Warm navigation: secondary panel painted | chrome | 43 (37–54) | 43 (32–53) | +0% |
| Typing: keystroke → rows committed (median key) | chromium | 5.0 (4.1–6.1) | 3.3 (2.2–3.7) | +54% |
| Typing: keystroke → rows committed (median key) | firefox | 6.0 (5.0–7.0) | 3.5 (2.0–5.0) | +71% |
| Typing: keystroke → rows committed (median key) | webkit | 3.5 (3.0–4.0) | 3.0 (2.5–3.0) | +17% |
| Typing: keystroke → rows committed (median key) | chrome | 4.3 (3.1–5.4) | 3.1 (1.7–3.4) | +35% |
| Typing: slowest keystroke → painted | chromium | 11 (9.0–14) | 13 (9.4–18) | −19% |
| Typing: slowest keystroke → painted | firefox | 11 (9.0–12) | 8.0 (5.0–10) | +38% |
| Typing: slowest keystroke → painted | webkit | 18 (9.0–27) | 14 (13–17) | +29% |
| Typing: slowest keystroke → painted | chrome | 12 (10–18) | 12 (4.7–15) | +4% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 10 (8.0–11) | 17 (16–18) | −42% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | firefox | 7.0 (7.0–10) | 10 (8.0–13) | −30% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | webkit | 10 (9.5–11) | 15 (15–16) | −33% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chrome | 6.9 (5.8–9.5) | 19 (18–20) | −64% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 10 (8.0–11) | 7.3 (6.0–7.5) | +38% |
| Typing, useDeferredValue: keystroke → next frame (median key) | firefox | 7.0 (7.0–10) | 6.0 (4.0–7.5) | +17% |
| Typing, useDeferredValue: keystroke → next frame (median key) | webkit | 10 (9.5–11) | 6.0 (5.0–7.0) | +67% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chrome | 6.9 (5.8–9.5) | 6.1 (4.6–6.8) | +12% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 12 (11–19) | 14 (8.9–22) | −12% |
| Typing, useDeferredValue: slowest keystroke → next frame | firefox | 12 (11–13) | 9.0 (9.0–11) | +33% |
| Typing, useDeferredValue: slowest keystroke → next frame | webkit | 22 (14–24) | 22 (11–24) | +0% |
| Typing, useDeferredValue: slowest keystroke → next frame | chrome | 15 (8.8–17) | 19 (7.7–22) | −24% |
| Navigation from a small page (/about), cold: required content painted | chromium | 65 (58–67) | 59 (54–63) | +10% |
| Navigation from a small page (/about), cold: required content painted | firefox | 61 (58–64) | 62 (57–66) | −2% |
| Navigation from a small page (/about), cold: required content painted | webkit | 64 (56–69) | 66 (64–90) | −3% |
| Navigation from a small page (/about), cold: required content painted | chrome | 58 (50–70) | 62 (55–66) | −6% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 163 (159–178) | 370 (354–372) | −56% |
| Navigation from a small page (/about), cold: secondary panel painted | firefox | 166 (159–176) | 359 (354–369) | −54% |
| Navigation from a small page (/about), cold: secondary panel painted | webkit | 171 (166–175) | 372 (367–397) | −54% |
| Navigation from a small page (/about), cold: secondary panel painted | chrome | 166 (164–173) | 361 (352–374) | −54% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 13 (7.4–17) | 13 (5.8–16) | +2% |
| Navigation from a small page (/about), preloaded: required content painted | firefox | 16 (10–19) | 15 (8.0–21) | +7% |
| Navigation from a small page (/about), preloaded: required content painted | webkit | 19 (14–21) | 19 (17–19) | +0% |
| Navigation from a small page (/about), preloaded: required content painted | chrome | 17 (13–19) | 12 (7.3–17) | +38% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/webkit −4% (tolerance 5%); suspRequired/chrome +6% (tolerance 5%); typePaint/chromium +19% (tolerance 7%); typePaint/firefox +33% (tolerance 5%); typePaint/webkit +12% (tolerance 6%).
