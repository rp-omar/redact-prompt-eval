| Measure | Redact | React DOM | Redact vs React DOM |
|---|---:|---:|---:|
| Cold-entry JS, Brotli, `/` (budget 150 kB) | 57.3 kB ✓ | 95.4 kB ✓ | −40% |
| Cold-entry JS, Brotli, `/items/$id` (budget 150 kB) | 57.2 kB ✓ | 95.3 kB ✓ | −40% |
| Route-specific startup JS, Brotli, `/` (budget 50 kB) | 4.4 kB ✓ | 4.4 kB ✓ | −1% |
| Route-specific startup JS, Brotli, `/items/$id` (budget 50 kB) | 4.3 kB ✓ | 4.3 kB ✓ | −1% |
| First-view CSS, Brotli, `/` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| First-view CSS, Brotli, `/items/$id` (budget 20 kB) | 1.1 kB ✓ | 1.1 kB ✓ | +0% |
| Cold entry → usable content (list, 5,000 rows painted), chromium, ms | 382 (369–387) | 337 (328–351) | +13% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), firefox, ms | 473 (467–506) | 389 (384–405) | +22% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), webkit, ms | 668 (661–682) | 662 (654–669) | +1% (A/A noise 1%) |
| Cold entry → usable content (list, 5,000 rows painted), chrome, ms | 424 (412–434) | 391 (377–410) | +9% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chromium, ms | 132 (125–138) | 65 (63–73) | +103% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), firefox, ms | 218 (210–224) | 74 (63–76) | +195% (A/A noise 3%) |
| Warm navigation → visible content (preloaded, click → painted), webkit, ms | 89 (77–95) | 59 (57–62) | +51% (A/A noise 0%) |
| Warm navigation → visible content (preloaded, click → painted), chrome, ms | 141 (133–153) | 72 (64–78) | +97% (A/A noise 7%) |
| Suspense navigation (cold click → required content painted), chromium, ms | 167 (157–171) | 92 (82–106) | +82% (A/A noise 5%) |
| Suspense navigation (cold click → required content painted), firefox, ms | 268 (260–277) | 123 (118–133) | +118% (A/A noise 1%) |
| Suspense navigation (cold click → required content painted), webkit, ms | 148 (137–155) | 116 (111–117) | +28% (A/A noise 0%) |
| Suspense navigation (cold click → required content painted), chrome, ms | 175 (153–178) | 93 (92–103) | +88% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chromium, ms | 131 (130–135) | 44 (42–45) | +195% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), firefox, ms | 287 (281–293) | 77 (74–79) | +275% (A/A noise 1%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), webkit, ms | 93 (89–96) | 58 (57–61) | +60% (A/A noise 3%) |
| Input latency, filter over 5,000 rows (keystroke → rows painted, median key), chrome, ms | 141 (140–144) | 45 (44–48) | +212% (A/A noise 1%) |

Timings: median (min–max) in ms over 9 runs per renderer per browser (5 typing runs × 10 keystrokes), production builds under `scripts/serve.mjs` (Brotli) on localhost, renderers interleaved. Browsers: chromium 159.0.8154.6, firefox 159.0, webkit 27.2, chrome 158.0.8127.37. Mock API delays: {"list":30,"item":40,"activity":150,"save":40} ms. Condition: {"variant":"default","serve":"brotli","throttle":null}.

| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |
|---|---|---:|---:|---:|
| Cold entry, list: rows committed to DOM | chromium | 162 (156–167) | 128 (125–134) | +26% |
| Cold entry, list: rows committed to DOM | firefox | 300 (297–318) | 222 (219–231) | +35% |
| Cold entry, list: rows committed to DOM | webkit | 180 (177–186) | 157 (155–164) | +15% |
| Cold entry, list: rows committed to DOM | chrome | 204 (194–205) | 169 (165–180) | +21% |
| Cold entry, detail: required content painted | chromium | 74 (73–74) | 76 (74–78) | −2% |
| Cold entry, detail: required content painted | firefox | 88 (85–95) | 96 (88–101) | −8% |
| Cold entry, detail: required content painted | webkit | 77 (76–81) | 83 (82–84) | −7% |
| Cold entry, detail: required content painted | chrome | 77 (69–81) | 85 (79–90) | −10% |
| Cold entry, detail: secondary panel painted | chromium | 188 (171–189) | 391 (388–391) | −52% |
| Cold entry, detail: secondary panel painted | firefox | 187 (184–194) | 397 (387–402) | −53% |
| Cold entry, detail: secondary panel painted | webkit | 184 (183–191) | 388 (386–391) | −53% |
| Cold entry, detail: secondary panel painted | chrome | 183 (174–190) | 386 (378–392) | −53% |
| Suspense navigation: secondary panel painted | chromium | 178 (162–186) | 392 (371–404) | −55% |
| Suspense navigation: secondary panel painted | firefox | 276 (262–282) | 413 (403–420) | −33% |
| Suspense navigation: secondary panel painted | webkit | 165 (160–175) | 417 (413–421) | −60% |
| Suspense navigation: secondary panel painted | chrome | 189 (160–193) | 389 (387–402) | −51% |
| Secondary panel: data received → committed | chromium | 7.6 (0.6–13) | 219 (212–225) | −97% |
| Secondary panel: data received → committed | firefox | 101 (89–111) | 229 (221–240) | −56% |
| Secondary panel: data received → committed | webkit | 1.0 (1.0–2.0) | 250 (246–253) | −100% |
| Secondary panel: data received → committed | chrome | 16 (0.8–20) | 221 (221–224) | −93% |
| Warm navigation: secondary panel painted | chromium | 132 (126–138) | 65 (63–73) | +103% |
| Warm navigation: secondary panel painted | firefox | 218 (210–224) | 74 (63–76) | +195% |
| Warm navigation: secondary panel painted | webkit | 89 (77–95) | 59 (57–62) | +51% |
| Warm navigation: secondary panel painted | chrome | 141 (133–154) | 72 (64–78) | +97% |
| Typing: keystroke → rows committed (median key) | chromium | 116 (113–118) | 12 (12–12) | +864% |
| Typing: keystroke → rows committed (median key) | firefox | 192 (187–194) | 22 (21–26) | +770% |
| Typing: keystroke → rows committed (median key) | webkit | 73 (71–79) | 15 (15–16) | +387% |
| Typing: keystroke → rows committed (median key) | chrome | 123 (119–125) | 14 (12–15) | +767% |
| Typing: slowest keystroke → painted | chromium | 313 (310–316) | 151 (145–155) | +107% |
| Typing: slowest keystroke → painted | firefox | 583 (577–595) | 354 (352–366) | +65% |
| Typing: slowest keystroke → painted | webkit | 481 (475–496) | 413 (411–418) | +16% |
| Typing: slowest keystroke → painted | chrome | 333 (330–366) | 222 (215–233) | +50% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chromium | 160 (158–168) | 56 (55–58) | +186% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | firefox | 280 (256–301) | 83 (80–87) | +239% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | webkit | 96 (91–98) | 77 (75–78) | +24% |
| Typing, useDeferredValue: keystroke → rows painted (median key) | chrome | 169 (167–174) | 58 (56–62) | +192% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chromium | 160 (158–167) | 19 (19–22) | +732% |
| Typing, useDeferredValue: keystroke → next frame (median key) | firefox | 280 (256–301) | 17 (16–17) | +1597% |
| Typing, useDeferredValue: keystroke → next frame (median key) | webkit | 96 (91–98) | 25 (25–25) | +282% |
| Typing, useDeferredValue: keystroke → next frame (median key) | chrome | 169 (167–174) | 23 (20–24) | +624% |
| Typing, useDeferredValue: slowest keystroke → next frame | chromium | 255 (247–265) | 51 (48–66) | +405% |
| Typing, useDeferredValue: slowest keystroke → next frame | firefox | 593 (586–617) | 85 (30–243) | +598% |
| Typing, useDeferredValue: slowest keystroke → next frame | webkit | 469 (465–483) | 80 (78–82) | +486% |
| Typing, useDeferredValue: slowest keystroke → next frame | chrome | 288 (285–297) | 50 (49–70) | +474% |
| Navigation from a small page (/about), cold: required content painted | chromium | 64 (63–66) | 65 (62–77) | −1% |
| Navigation from a small page (/about), cold: required content painted | firefox | 63 (59–71) | 63 (57–75) | +0% |
| Navigation from a small page (/about), cold: required content painted | webkit | 63 (54–65) | 65 (59–67) | −3% |
| Navigation from a small page (/about), cold: required content painted | chrome | 64 (58–71) | 62 (58–73) | +2% |
| Navigation from a small page (/about), cold: secondary panel painted | chromium | 177 (163–178) | 372 (369–372) | −52% |
| Navigation from a small page (/about), cold: secondary panel painted | firefox | 166 (165–175) | 367 (361–370) | −55% |
| Navigation from a small page (/about), cold: secondary panel painted | webkit | 170 (166–173) | 370 (365–377) | −54% |
| Navigation from a small page (/about), cold: secondary panel painted | chrome | 171 (163–177) | 370 (358–372) | −54% |
| Navigation from a small page (/about), preloaded: required content painted | chromium | 17 (13–18) | 14 (10–17) | +20% |
| Navigation from a small page (/about), preloaded: required content painted | firefox | 19 (13–20) | 19 (8.0–20) | +0% |
| Navigation from a small page (/about), preloaded: required content painted | webkit | 18 (15–21) | 17 (15–20) | +6% |
| Navigation from a small page (/about), preloaded: required content painted | chrome | 16 (14–17) | 14 (11–15) | +14% |

Gate: cold entry improves = false; interactions hold = false; ship Redact = false.
Failing: coldList/chromium +13% (tolerance 5%); coldList/firefox +22% (tolerance 5%); coldList/webkit +1% (tolerance 5%); coldList/chrome +9% (tolerance 5%); suspRequired/chromium +82% (tolerance 5%); suspRequired/firefox +118% (tolerance 5%); suspRequired/webkit +28% (tolerance 5%); suspRequired/chrome +88% (tolerance 5%); typePaint/chromium +195% (tolerance 5%); typePaint/firefox +275% (tolerance 5%); typePaint/webkit +60% (tolerance 5%); typePaint/chrome +212% (tolerance 5%).
