| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 372 (365–402) | 332 (326–365) | +12% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), firefox, ms | 476 (452–619) | 384 (374–417) | +24% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), webkit, ms | 659 (651–746) | 642 (635–714) | +3% (A/A noise 0%) |
| Cold entry → usable content (list, 5,000 rows painted), chrome, ms | 417 (406–425) | 377 (374–412) | +11% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 129 (123–132) | 65 (61–74) | +100% (A/A noise 2%) |
| Warm navigation → visible content (preloaded, click → painted), firefox, ms | 229 (202–268) | 73 (72–78) | +214% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), webkit, ms | 92 (90–105) | 55 (50–59) | +67% (A/A noise 4%) |
| Warm navigation → visible content (preloaded, click → painted), chrome, ms | 139 (133–143) | 60 (55–67) | +134% (A/A noise 10%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 165 (141–171) | 94 (79–101) | +76% (A/A noise 3%) |
| Suspense navigation (cold click → required content painted), firefox, ms | 264 (240–281) | 122 (117–132) | +116% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), webkit, ms | 144 (137–165) | 113 (99–118) | +27% (A/A noise 0%) |
| Suspense navigation (cold click → required content painted), chrome, ms | 168 (161–175) | 98 (80–101) | +71% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 117 (115–119) | 36 (34–39) | +224% (A/A noise 3%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox, ms | 223 (204–249) | 39 (35–39) | +472% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), webkit, ms | 88 (86–91) | 49 (47–50) | +81% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chrome, ms | 122 (121–126) | 36 (34–37) | +238% (A/A noise 1%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6, firefox 159.0, webkit 27.2, chrome 158.0.8127.37. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"default","serve":"brotli","throttle":null}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 159 (155–168) | 127 (125–137) | +26% |
| Cold entry, list: rows committed to DOM | firefox | 300 (288–402) | 219 (207–237) | +37% |
| Cold entry, list: rows committed to DOM | webkit | 175 (171–183) | 154 (153–171) | +14% |
| Cold entry, list: rows committed to DOM | chrome | 197 (195–200) | 165 (163–177) | +20% |
| Cold entry, detail: required content painted | chromium | 74 (73–75) | 74 (74–77) | −0% |
| Cold entry, detail: required content painted | firefox | 90 (83–95) | 96 (84–100) | −6% |
| Cold entry, detail: required content painted | webkit | 76 (73–81) | 80 (78–87) | −5% |
| Cold entry, detail: required content painted | chrome | 81 (68–84) | 81 (78–87) | −0% |
| Cold entry, detail: secondary panel painted | chromium | 173 (171–189) | 390 (375–391) | −56% |
| Cold entry, detail: secondary panel painted | firefox | 189 (183–199) | 392 (376–398) | −52% |
| Cold entry, detail: secondary panel painted | webkit | 182 (179–190) | 385 (383–390) | −53% |
| Cold entry, detail: secondary panel painted | chrome | 179 (175–182) | 383 (379–398) | −53% |
| Suspense navigation: secondary panel painted | chromium | 176 (158–186) | 389 (380–402) | −55% |
| Suspense navigation: secondary panel painted | firefox | 276 (243–291) | 408 (399–420) | −32% |
| Suspense navigation: secondary panel painted | webkit | 167 (161–174) | 413 (399–422) | −60% |
| Suspense navigation: secondary panel painted | chrome | 176 (166–193) | 386 (380–400) | −54% |
| Secondary panel: data received → committed | chromium | 5.0 (0.5–12) | 219 (211–223) | −98% |
| Secondary panel: data received → committed | firefox | 95 (72–114) | 228 (221–242) | −58% |
| Secondary panel: data received → committed | webkit | 2.0 (1.0–3.0) | 245 (235–252) | −99% |
| Secondary panel: data received → committed | chrome | 8.0 (2.4–13) | 220 (210–223) | −96% |
| Warm navigation: secondary panel painted | chromium | 129 (123–132) | 65 (61–74) | +100% |
| Warm navigation: secondary panel painted | firefox | 229 (202–268) | 73 (72–78) | +214% |
| Warm navigation: secondary panel painted | webkit | 92 (90–105) | 55 (50–59) | +67% |
| Warm navigation: secondary panel painted | chrome | 139 (133–143) | 60 (55–67) | +134% |
| Typing: keystroke → rows committed (median key) | chromium | 106 (104–106) | 11 (9.8–11) | +906% |
| Typing: keystroke → rows committed (median key) | firefox | 177 (163–186) | 21 (19–21) | +761% |
| Typing: keystroke → rows committed (median key) | webkit | 73 (70–75) | 11 (11–12) | +559% |
| Typing: keystroke → rows committed (median key) | chrome | 108 (107–110) | 12 (12–13) | +781% |
| Typing: slowest keystroke → painted | chromium | 294 (290–316) | 213 (211–222) | +38% |
| Typing: slowest keystroke → painted | firefox | 585 (576–606) | 359 (354–374) | +63% |
| Typing: slowest keystroke → painted | webkit | 567 (547–588) | 485 (478–504) | +17% |
| Typing: slowest keystroke → painted | chrome | 328 (318–336) | 251 (242–261) | +31% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 148 (146–159) | 44 (41–47) | +233% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | firefox | 261 (251–264) | 42 (38–46) | +521% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | webkit | 93 (89–104) | 57 (56–60) | +64% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chrome | 159 (154–167) | 45 (44–48) | +249% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 148 (146–159) | 17 (17–18) | +753% |
| Typing, useDeferredValue: keystroke → next frame (median key) | firefox | 261 (251–264) | 15 (14–16) | +1700% |
| Typing, useDeferredValue: keystroke → next frame (median key) | webkit | 93 (89–104) | 21 (20–22) | +351% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chrome | 159 (154–167) | 18 (17–21) | +805% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 258 (252–277) | 64 (43–66) | +304% |
| Typing, useDeferredValue: slowest keystroke → next frame | firefox | 606 (584–619) | 123 (121–128) | +393% |
| Typing, useDeferredValue: slowest keystroke → next frame | webkit | 537 (519–566) | 82 (79–113) | +555% |
| Typing, useDeferredValue: slowest keystroke → next frame | chrome | 292 (288–304) | 65 (65–67) | +349% |
| Navigation from a small page (/about), cold: required content painted | chromium | 67 (60–67) | 62 (56–74) | +7% |
| Navigation from a small page (/about), cold: required content painted | firefox | 65 (61–72) | 62 (53–66) | +5% |
| Navigation from a small page (/about), cold: required content painted | webkit | 65 (59–84) | 65 (59–67) | +0% |
| Navigation from a small page (/about), cold: required content painted | chrome | 68 (57–71) | 61 (58–65) | +12% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 178 (161–180) | 370 (354–373) | −52% |
| Navigation from a small page (/about), cold: secondary panel painted | firefox | 169 (167–178) | 363 (352–370) | −53% |
| Navigation from a small page (/about), cold: secondary panel painted | webkit | 173 (165–179) | 369 (363–374) | −53% |
| Navigation from a small page (/about), cold: secondary panel painted | chrome | 165 (162–167) | 360 (358–362) | −54% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 17 (12–22) | 16 (11–17) | +10% |
| Navigation from a small page (/about), preloaded: required content painted | firefox | 19 (16–21) | 18 (8.0–20) | +6% |
| Navigation from a small page (/about), preloaded: required content painted | webkit | 19 (9.0–21) | 13 (8.0–18) | +46% |
| Navigation from a small page (/about), preloaded: required content painted | chrome | 17 (13–20) | 14 (9.1–16) | +29% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/chromium +12% (tolerance 5%); coldList/firefox +24% (tolerance 5%); coldList/webkit +3% (tolerance 5%); coldList/chrome +11% (tolerance 5%); suspRequired/chromium +76% (tolerance 5%); suspRequired/firefox +116% (tolerance 5%); suspRequired/webkit +27% (tolerance 5%); suspRequired/chrome +71% (tolerance 5%); typePaint/chromium +224% (tolerance 5%); typePaint/firefox +472% (tolerance 5%); typePaint/webkit +81% (tolerance 5%); typePaint/chrome +238% (tolerance 5%).
