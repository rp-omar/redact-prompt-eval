| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 67.0 kB ✓ | 105.2 kB ✓ | −36% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.4 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 14.1 kB ✓ | 14.1 kB ✓ | −0% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | +0% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (virtualised list, first window painted), chromium, ms | 74 (71–77) | 80 (79–81) | −8% (A/A noise 1%) |
| Cold entry → usable content (virtualised list, first window painted), firefox, ms | 88 (85–115) | 94 (92–97) | −6% (A/A noise 0%) |
| Cold entry → usable content (virtualised list, first window painted), webkit, ms | 77 (75–81) | 82 (81–84) | −6% (A/A noise 1%) |
| Cold entry → usable content (virtualised list, first window painted), chrome, ms | 75 (74–78) | 82 (80–89) | −9% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 43 (29–44) | 39 (32–42) | +8% (A/A noise 2%) |
| Warm navigation → visible content (preloaded, click → painted), firefox, ms | 13 (8.0–16) | 10 (6.0–16) | +30% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), webkit, ms | 17 (9.0–18) | 13 (12–14) | +31% (A/A noise 8%) |
| Warm navigation → visible content (preloaded, click → painted), chrome, ms | 39 (32–43) | 43 (31–55) | −8% (A/A noise 7%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 65 (51–67) | 65 (49–81) | +0% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), firefox, ms | 58 (55–62) | 56 (53–61) | +4% (A/A noise 0%) |
| Suspense navigation (cold click → required content painted), webkit, ms | 62 (60–67) | 64 (55–66) | −3% (A/A noise 0%) |
| Suspense navigation (cold click → required content painted), chrome, ms | 64 (48–66) | 63 (48–66) | +2% (A/A noise 0%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 6.8 (5.4–7.6) | 7.4 (6.2–8.1) | −9% (A/A noise 39%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox, ms | 7.5 (6.0–8.5) | 5.5 (4.0–6.0) | +36% (A/A noise 9%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), webkit, ms | 9.0 (8.5–9.5) | 6.5 (6.0–9.5) | +38% (A/A noise 31%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chrome, ms | 6.1 (4.4–7.9) | 4.5 (3.6–7.1) | +34% (A/A noise 36%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6, firefox 159.0, webkit 27.2, chrome 158.0.8127.37. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"virtual","serve":"brotli","throttle":null}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 70 (68–73) | 76 (75–77) | −8% |
| Cold entry, list: rows committed to DOM | firefox | 79 (76–104) | 85 (84–88) | −7% |
| Cold entry, list: rows committed to DOM | webkit | 70 (69–75) | 75 (74–78) | −7% |
| Cold entry, list: rows committed to DOM | chrome | 71 (70–74) | 78 (76–85) | −9% |
| Cold entry, detail: required content painted | chromium | 74 (73–74) | 76 (75–78) | −2% |
| Cold entry, detail: required content painted | firefox | 91 (83–95) | 95 (93–165) | −4% |
| Cold entry, detail: required content painted | webkit | 75 (74–76) | 80 (79–86) | −6% |
| Cold entry, detail: required content painted | chrome | 76 (69–102) | 79 (78–85) | −5% |
| Cold entry, detail: secondary panel painted | chromium | 188 (188–188) | 390 (388–391) | −52% |
| Cold entry, detail: secondary panel painted | firefox | 191 (184–195) | 391 (382–468) | −51% |
| Cold entry, detail: secondary panel painted | webkit | 182 (180–192) | 387 (385–392) | −53% |
| Cold entry, detail: secondary panel painted | chrome | 184 (178–199) | 379 (377–396) | −51% |
| Suspense navigation: secondary panel painted | chromium | 164 (163–165) | 365 (351–380) | −55% |
| Suspense navigation: secondary panel painted | firefox | 168 (159–176) | 360 (353–364) | −53% |
| Suspense navigation: secondary panel painted | webkit | 169 (165–174) | 368 (362–375) | −54% |
| Suspense navigation: secondary panel painted | chrome | 164 (159–167) | 363 (349–366) | −55% |
| Secondary panel: data received → committed | chromium | 2.1 (0.8–2.8) | 195 (194–212) | −99% |
| Secondary panel: data received → committed | firefox | 2.0 (1.0–5.0) | 194 (192–196) | −99% |
| Secondary panel: data received → committed | webkit | 4.0 (3.0–5.0) | 200 (197–203) | −98% |
| Secondary panel: data received → committed | chrome | 1.3 (0.9–3.2) | 197 (193–199) | −99% |
| Warm navigation: secondary panel painted | chromium | 43 (29–44) | 39 (32–42) | +8% |
| Warm navigation: secondary panel painted | firefox | 13 (8.0–16) | 10 (6.0–16) | +30% |
| Warm navigation: secondary panel painted | webkit | 17 (9.0–18) | 13 (12–14) | +31% |
| Warm navigation: secondary panel painted | chrome | 39 (32–43) | 43 (31–55) | −8% |
| Typing: keystroke → rows committed (median key) | chromium | 3.8 (2.9–5.3) | 3.1 (2.6–3.5) | +21% |
| Typing: keystroke → rows committed (median key) | firefox | 5.5 (5.0–7.0) | 3.5 (2.5–3.5) | +57% |
| Typing: keystroke → rows committed (median key) | webkit | 4.0 (4.0–4.0) | 2.0 (2.0–3.0) | +100% |
| Typing: keystroke → rows committed (median key) | chrome | 3.6 (2.9–4.9) | 2.0 (1.9–3.3) | +80% |
| Typing: slowest keystroke → painted | chromium | 10 (8.9–19) | 12 (9.4–16) | −12% |
| Typing: slowest keystroke → painted | firefox | 11 (10–13) | 8.0 (7.0–10) | +38% |
| Typing: slowest keystroke → painted | webkit | 20 (14–31) | 22 (9.0–23) | −9% |
| Typing: slowest keystroke → painted | chrome | 9.7 (8.1–15) | 14 (9.6–17) | −32% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 9.2 (7.2–9.8) | 18 (16–20) | −49% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | firefox | 8.0 (6.0–9.5) | 10 (8.0–11) | −20% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | webkit | 10 (7.5–10) | 15 (14–16) | −31% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chrome | 7.1 (5.5–8.3) | 19 (12–20) | −62% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 9.1 (7.2–9.8) | 6.5 (3.6–7.5) | +40% |
| Typing, useDeferredValue: keystroke → next frame (median key) | firefox | 8.0 (6.0–9.5) | 6.0 (4.0–7.0) | +33% |
| Typing, useDeferredValue: keystroke → next frame (median key) | webkit | 10 (7.5–10) | 6.5 (4.0–7.0) | +54% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chrome | 7.1 (5.5–8.3) | 5.9 (3.9–7.4) | +19% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 12 (12–18) | 8.6 (5.6–19) | +44% |
| Typing, useDeferredValue: slowest keystroke → next frame | firefox | 11 (11–14) | 9.0 (7.0–9.0) | +22% |
| Typing, useDeferredValue: slowest keystroke → next frame | webkit | 14 (10–23) | 11 (7.0–20) | +27% |
| Typing, useDeferredValue: slowest keystroke → next frame | chrome | 12 (9.6–19) | 14 (5.1–20) | −14% |
| Navigation from a small page (/about), cold: required content painted | chromium | 65 (57–67) | 57 (56–63) | +15% |
| Navigation from a small page (/about), cold: required content painted | firefox | 59 (54–63) | 57 (50–65) | +4% |
| Navigation from a small page (/about), cold: required content painted | webkit | 66 (59–67) | 66 (57–68) | +0% |
| Navigation from a small page (/about), cold: required content painted | chrome | 64 (53–71) | 61 (56–64) | +5% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 176 (162–179) | 355 (354–373) | −50% |
| Navigation from a small page (/about), cold: secondary panel painted | firefox | 164 (157–175) | 355 (349–367) | −54% |
| Navigation from a small page (/about), cold: secondary panel painted | webkit | 171 (169–176) | 370 (363–376) | −54% |
| Navigation from a small page (/about), cold: secondary panel painted | chrome | 167 (161–191) | 359 (356–368) | −53% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 13 (8.0–18) | 12 (6.9–16) | +4% |
| Navigation from a small page (/about), preloaded: required content painted | firefox | 13 (10–17) | 10 (9.0–18) | +30% |
| Navigation from a small page (/about), preloaded: required content painted | webkit | 18 (16–21) | 19 (16–21) | −5% |
| Navigation from a small page (/about), preloaded: required content painted | chrome | 13 (7.9–18) | 12 (6.8–16) | +9% |

Gate: cold entry improves = true; interactions hold = false; ship Redact = false.
Failing: typePaint/firefox +36% (tolerance 9%); typePaint/webkit +38% (tolerance 31%).
