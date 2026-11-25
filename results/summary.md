| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 383 (372–399) | 338 (334–342) | +14% (A/A noise 0%) |
| Cold entry → usable content (list, 5,000 rows painted), firefox, ms | 462 (449–587) | 378 (375–385) | +22% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), webkit, ms | 657 (637–719) | 649 (624–670) | +1% (A/A noise 2%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 132 (127–136) | 65 (54–69) | +104% (A/A noise 1%) |
| Warm navigation → visible content (preloaded, click → painted), firefox, ms | 209 (202–225) | 71 (65–73) | +194% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), webkit, ms | 84 (79–91) | 56 (48–57) | +50% (A/A noise 4%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 166 (152–201) | 95 (93–103) | +75% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), firefox, ms | 263 (250–281) | 129 (115–135) | +104% (A/A noise 4%) |
| Suspense navigation (cold click → required content painted), webkit, ms | 141 (137–146) | 111 (102–115) | +27% (A/A noise 4%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 127 (125–136) | 42 (39–42) | +201% (A/A noise 2%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox, ms | 277 (272–303) | 77 (74–80) | +262% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), webkit, ms | 94 (90–99) | 59 (57–60) | +60% (A/A noise 1%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `vite preview` on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6, firefox 159.0, webkit 27.2. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 161 (159–169) | 128 (126–129) | +26% |
| Cold entry, list: rows committed to DOM | firefox | 295 (285–409) | 217 (216–222) | +36% |
| Cold entry, list: rows committed to DOM | webkit | 178 (171–181) | 154 (150–159) | +16% |
| Cold entry, detail: required content painted | chromium | 75 (75–76) | 77 (77–78) | −3% |
| Cold entry, detail: required content painted | firefox | 86 (83–94) | 95 (90–100) | −9% |
| Cold entry, detail: required content painted | webkit | 78 (74–82) | 82 (80–85) | −5% |
| Cold entry, detail: secondary panel painted | chromium | 189 (174–190) | 391 (389–392) | −52% |
| Cold entry, detail: secondary panel painted | firefox | 189 (184–195) | 391 (386–395) | −52% |
| Cold entry, detail: secondary panel painted | webkit | 188 (182–191) | 386 (384–389) | −51% |
| Suspense navigation: secondary panel painted | chromium | 179 (163–219) | 395 (390–397) | −55% |
| Suspense navigation: secondary panel painted | firefox | 267 (256–296) | 414 (405–424) | −36% |
| Suspense navigation: secondary panel painted | webkit | 169 (164–175) | 413 (401–422) | −59% |
| Secondary panel: data received → committed | chromium | 7.8 (0.7–40) | 222 (220–224) | −96% |
| Secondary panel: data received → committed | firefox | 93 (78–114) | 233 (222–237) | −60% |
| Secondary panel: data received → committed | webkit | 1.0 (1.0–2.0) | 245 (239–251) | −100% |
| Warm navigation: secondary panel painted | chromium | 132 (127–136) | 65 (54–69) | +104% |
| Warm navigation: secondary panel painted | firefox | 209 (202–225) | 71 (65–73) | +194% |
| Warm navigation: secondary panel painted | webkit | 84 (79–91) | 56 (48–57) | +50% |
| Typing: keystroke → rows committed (median key) | chromium | 111 (110–117) | 12 (10.0–12) | +823% |
| Typing: keystroke → rows committed (median key) | firefox | 186 (183–192) | 22 (21–23) | +763% |
| Typing: keystroke → rows committed (median key) | webkit | 76 (75–78) | 14 (14–15) | +439% |
| Typing: slowest keystroke → painted | chromium | 303 (298–315) | 143 (140–143) | +113% |
| Typing: slowest keystroke → painted | firefox | 567 (561–591) | 353 (345–383) | +61% |
| Typing: slowest keystroke → painted | webkit | 499 (492–523) | 428 (415–433) | +17% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 158 (154–160) | 56 (55–57) | +182% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | firefox | 274 (268–279) | 83 (78–91) | +232% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | webkit | 93 (91–95) | 77 (76–78) | +21% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 158 (154–160) | 21 (19–24) | +652% |
| Typing, useDeferredValue: keystroke → next frame (median key) | firefox | 274 (268–279) | 17 (16–17) | +1558% |
| Typing, useDeferredValue: keystroke → next frame (median key) | webkit | 93 (91–95) | 24 (24–28) | +285% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 240 (235–245) | 48 (48–65) | +401% |
| Typing, useDeferredValue: slowest keystroke → next frame | firefox | 575 (563–608) | 234 (229–360) | +146% |
| Typing, useDeferredValue: slowest keystroke → next frame | webkit | 474 (472–479) | 80 (78–81) | +493% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/chromium +14% (tolerance 5%); coldList/firefox +22% (tolerance 5%); coldList/webkit +1% (tolerance 5%); suspRequired/chromium +75% (tolerance 5%); suspRequired/firefox +104% (tolerance 5%); suspRequired/webkit +27% (tolerance 5%); typePaint/chromium +201% (tolerance 5%); typePaint/firefox +262% (tolerance 5%); typePaint/webkit +60% (tolerance 5%).
