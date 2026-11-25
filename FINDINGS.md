# Findings

Evaluation of [PROMPT.md](PROMPT.md) ("Build a fast client-rendered React app") by building a minimal app from it. Run on 2026-11-25, macOS (Apple silicon), Node 26.13.0, Bun 1.4.5.

Each entry is tagged: **WRONG** (the prompt states or implies something false), **UNDERSPECIFIED** (I had to decide), **REDUNDANT**, **UNBUILDABLE** (could not be done in this run), **CONFIRMED** (the prompt's claim held), or **RESULT** (measured outcome). Decisions were made on Omar's behalf and are recorded where they occur.

## Outcome in one paragraph

The five-plugin chain builds first try on both renderers, and every byte budget passes with wide headroom. Under the prompt's own gate Redact does **not** ship: cold entry does not improve in any browser (+1% to +22%), Suspense navigation is 27–104% slower, and input latency over 5,000 rows is 60–262% slower. No required flow broke on Redact. React DOM is the renderer to ship for this app.

## Ship rule, fixed before the timing run (2026-11-25)

PROMPT.md says "Ship Redact when cold entry improves and those interactions hold their baseline", with no tolerance. Rule used here, written before any full benchmark run (committed in `feecc8b`, ahead of the results):

- Baseline = React DOM build of the same commit. Noise floor per metric and browser = relative difference between the medians of two identical React DOM previews (A/A).
- Tolerance per metric and browser = max(A/A noise floor, 5%).
- "Cold entry improves": Redact's median cold-entry time to usable content (list route, navigation start to 5,000 rows painted) is lower than React DOM's by more than the tolerance, in all three browsers.
- "Interactions hold their baseline": Redact's median is not above React DOM's by more than the tolerance for Suspense navigation (click to required content painted) and for input latency (keystroke to filtered rows painted, plain state variant), in all three browsers.
- "Breaks a required flow": any failure in tests/flows.pw.ts on the Redact build in any browser.
- Redact ships only if all three hold. Bytes are reported but are not part of the prompt's gate.

## Results

Full tables: [results/summary.md](results/summary.md). Raw samples: [results/raw/](results/raw). Timings were recorded at commit `feecc8b`; later commits only reformat, fix types and add the dev-cache fix (F-08), none of which change the production bundles' behaviour.

### R-1 RESULT: gate fails on all three conditions that were measured

| Gate metric (median ms)                | Browser  | Redact | React DOM |     Δ | A/A noise |
| -------------------------------------- | -------- | -----: | --------: | ----: | --------: |
| Cold entry → usable content            | Chromium |    383 |       338 |  +14% |        0% |
|                                        | Firefox  |    462 |       378 |  +22% |        1% |
|                                        | WebKit   |    657 |       649 |   +1% |        2% |
| Suspense navigation → required content | Chromium |    166 |        95 |  +75% |        1% |
|                                        | Firefox  |    263 |       129 | +104% |        4% |
|                                        | WebKit   |    141 |       111 |  +27% |        4% |
| Input latency, 5,000 rows              | Chromium |    127 |        42 | +201% |        2% |
|                                        | Firefox  |    277 |        77 | +262% |        1% |
|                                        | WebKit   |     94 |        59 |  +60% |        1% |

Warm (preloaded) navigation, not part of the gate but a prompt target (≤ 200 ms): Redact 132 / 209 / 84 ms vs React DOM 65 / 71 / 56 ms. Redact misses the 200 ms target in Firefox.

Variance: min–max ranges are in results/summary.md. They are tight (typically ±5%) and never overlap between renderers on the interaction metrics. Redact's Firefox cold entry had one outlier run (587 ms against a 462 ms median).

### R-2 RESULT: where Redact loses, and why (diagnosed, not just measured)

A keystroke whose filter still matches all 5,000 rows changes nothing in the DOM (0 mutation records on both renderers), yet costs ~145 ms on Redact and ~6 ms on React DOM in Chromium. A CPU profile puts Redact's time in its own reconciler functions. Three diagnostic builds narrow it down:

| Chromium, keystroke → commit, 5,000 rows unchanged        |  Redact | React DOM |
| --------------------------------------------------------- | ------: | --------: |
| As specified (React Compiler on, router `<Link>` per row) | ~145 ms |     ~6 ms |
| `COMPILER=off`                                            | ~160 ms |    ~20 ms |
| `PLAIN_LINKS=1` (`<a>` instead of `<Link>`)               | ~140 ms |     ~6 ms |

So the cost is not the React Compiler and not TanStack Router's `Link`: Redact re-renders and diffs the whole 5,000-row tree at roughly 30 µs per row, and gains almost nothing from compiler memoisation, where React DOM skips unchanged subtrees. The same cost explains the slower navigations: both navigation metrics start on the list page, so they include tearing down 5,000 rows. That last link is an inference; I did not measure navigation from a small page. The opposite direction supports it: cold entry straight into the small detail page is 3–9% _faster_ on Redact.

### R-3 RESULT: `useDeferredValue` does not rescue Redact

The prompt warns that on Redact "useDeferredValue keeps stale results". Measured with `/?deferred=true`: on React DOM the next frame after a keystroke arrives in 17–24 ms (the input stays responsive while rows catch up). On Redact it arrives with the rows, 93–274 ms later, because rendering is synchronous. The result converges correctly on both (flow test passes); only responsiveness differs.

### R-4 RESULT: Redact reveals Suspense content faster

The one clear Redact win. After the secondary panel's data arrives, Redact commits it in 1–8 ms (93 ms in Firefox); React DOM waits ~225–245 ms, because React throttles revealing content that replaces a recently shown fallback. End to end the panel is painted ~190 ms after cold entry on Redact against ~390 ms on React DOM. The prompt's instruction to give secondary panels their own Suspense boundary therefore costs React DOM about 225 ms for that panel whenever its data lands shortly after the fallback. The prompt does not mention this trade-off.

### R-5 RESULT: bytes

| Brotli                      |     Redact |  React DOM | Budget |
| --------------------------- | ---------: | ---------: | -----: |
| Cold-entry JS, `/`          |    57.3 kB |    95.4 kB | 150 kB |
| Cold-entry JS, `/items/$id` |    57.2 kB |    95.3 kB | 150 kB |
| Route-specific startup JS   | 4.3–4.4 kB | 4.3–4.4 kB |  50 kB |
| First-view CSS              |     1.1 kB |     1.1 kB |  20 kB |

Redact saves 38 kB Brotli (−40%) of cold-entry JS. The 150 kB budget is reachable on both renderers with Router + Query + StyleX; at this app size it constrains nothing (see F-21).

### R-6 RESULT: required flows

`tests/flows.pw.ts`: 54/54 pass (9 flows × 2 renderers × 3 browsers), covering renderer identity, cold network log vs budget file set, list + filter, `useDeferredValue` variant, hover preload, `preload={false}`, keyboard-focus preload, Suspense navigation, the lazy editor (form in a portal, save, fetched once), direct link and cold tap. No Redact-only functional failure in Chromium, Firefox or WebKit.

### R-7 RESULT: the prompt's command list

| Command                          | Result                                             |
| -------------------------------- | -------------------------------------------------- |
| `bun ci`                         | pass (frozen-lockfile install)                     |
| `bun lint`                       | pass, but only after adding a `lint` script (F-23) |
| `bun fmt --check`                | pass, after adding ignores (F-24)                  |
| `bun check`                      | pass (`No type errors in 18 files`)                |
| `bun test`                       | pass (1 unit test)                                 |
| `bun run build`                  | pass, both renderers                               |
| React Doctor 0.9.23 static check | runs non-interactively; 1 warning (F-26)           |
| `react-doctor scan`              | not run (interactive by design)                    |

## Build errors

There were none from the plugin chain. Every error hit during the run, with its text and fix:

| #   | Error text                                                                                                                                                                                | Cause                                                                                                                                                       | Fix                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| E-1 | `error: Script not found "lint"`                                                                                                                                                          | `bun lint` is not a Bun subcommand; the prompt names no linter                                                                                              | Added `"lint": "oxlint src mock scripts tests"` and `oxlint` as a devDependency  |
| E-2 | `[WebServer] /bin/sh: vite: command not found`                                                                                                                                            | Playwright `webServer` does not put `node_modules/.bin` on PATH                                                                                             | Used `./node_modules/.bin/vite` (my config, not the prompt)                      |
| E-3 | `Property 'responseEnd' does not exist on type 'PerformanceEntry'.` (TS2339)                                                                                                              | My benchmark code                                                                                                                                           | Cast to `PerformanceResourceTiming[]`                                            |
| E-4 | `Cannot find module 'bun:test' or its corresponding type declarations.` (TS2307)                                                                                                          | `bun check` needs `@types/bun` and `"types": ["bun"]`; the prompt lists neither                                                                             | Added both                                                                       |
| E-5 | `31 files need formatting. Run bun fmt to fix them.`                                                                                                                                      | `bun fmt --check` covers `PROMPT.md`, `src/routeTree.gen.ts` and JSON results                                                                               | `.prettierignore` + `[fmt]` in `bunfig.toml`, then `bun fmt`                     |
| E-6 | `Invalid hook call. Hooks can only be called inside of the body of a function component.` then `TypeError: Cannot read properties of null (reading 'useEffect')` at `QueryClientProvider` | Dev only: Redact and React DOM dev servers running at once share `node_modules/.vite`; React Query was pre-bundled against real React while Redact rendered | `cacheDir: node_modules/.vite-${renderer}` (F-08)                                |
| E-7 | Playwright: `expect(locator).toBeVisible() failed … getByTestId('activity-fallback')` on Redact in all three browsers                                                                     | My test polled for a fallback that Redact shows for ~10 ms                                                                                                  | Record first-seen times in the page with a MutationObserver. Not a Redact defect |

Warnings only: Vite 8.3.8 prints `Your Vite config uses features that are unsupported by configLoader: 'native'` for extension-less imports in `vite.config.ts` (fixed by adding `.ts`); Rolldown prints `[MODULE_LEVEL_DIRECTIVE]` for `"use client"` in `@tanstack/react-router` when `react()` is absent from the chain.

## Prompt defects and decisions

### Stack and setup

- **F-01 UNDERSPECIFIED: no product spec.** The prompt describes a stack, not an app. Routes, data and the lazy feature came from the task brief.
- **F-02 UNDERSPECIFIED: Bun pinning.** "Bun 1.4.5 for development and CI" does not say how to pin it. Bun was absent on this machine. Decision (Omar chose it when asked, before the "decide on my behalf" instruction arrived): `bun@1.4.5` as a project devDependency, bootstrapped with `npm install --no-package-lock --save-dev --save-exact bun@1.4.5`, then `./node_modules/.bin/bun install`. Nothing was installed globally. npm skipped Bun's postinstall script; the binary still runs (`bun --version` → `1.4.5`).
- **F-03 UNDERSPECIFIED: packages the prompt needs but does not list.** `@stylexjs/stylex` (runtime; only the unplugin is named), `@babel/core` (peer of `@rolldown/plugin-babel`: `^7.29.0 || ^8.0.0-rc.1`; arrived transitively as 7.29.13), `@types/react`, `@types/react-dom`, `@types/node`, `@types/bun`, `@playwright/test`, a linter, and `web-vitals`. I pinned the ones used: Playwright 1.65.1, oxlint 1.81.0, `@types/react` 19.3.2, `@types/react-dom` 19.3.0.
- **F-04 CONFIRMED: versions.** All pinned versions install together with no peer conflicts. "TypeScript 7.0.2 (strict is the default)" holds: with no `strict` in `tsconfig.json`, `bun check` reports `TS7006 Parameter 'x' implicitly has an 'any' type.`

### Build with Redact

- **F-05 CONFIRMED: the five-plugin chain builds.** Added one plugin at a time (`CHAIN=1..5`), each step built first try, on both renderers. The stop condition "the plugin chain will not build" did not trigger.
- **F-06 WRONG (minor): the order of `redact()` is not meaningful.** The plugin registers with `enforce: 'pre'`, so listing it fifth does not make it run fifth. The numbered list implies an ordering that Vite does not apply to it.
- **F-07 REDUNDANT / UNDERSPECIFIED: plugin details.** `stylex.vite({ runtimeInjection: false })` restates the default (`options.runtimeInjection ?? false` in `@stylexjs/babel-plugin`). The prompt does not say that `reactCompilerPreset` is exported by `@vitejs/plugin-react`, or that `stylex` is the default export of `@stylexjs/unplugin`.
- **F-08 WRONG by omission: the renderer switch needs more than omitting `redact()`.** Three things the prompt's one-line switch misses:
  1. _Separate output directories._ "Both builds must come from the same commit" but both write to `dist`. Decision: `dist-redact` and `dist-react-dom`.
  2. _Separate Vite dep caches._ Running both dev servers at once breaks the Redact one with `Invalid hook call` (E-6). Decision: `cacheDir` keyed by renderer. Verified: both dev servers then render 5,000 rows with no console errors. I did not test switching `RENDERER` back and forth on one cache sequentially.
  3. _Proof of which renderer is in the bundle._ Router and Query import React transitively, so a leaked import would void the comparison. Decision: a build-time `__RENDERER__` marker on `<html data-renderer>`, plus a test that `__reactFiber$` exists only in the React DOM bundle and only on React DOM host nodes.
- **F-09 UNDERSPECIFIED: StyleX CSS is one file for the whole app.** The unplugin appends all StyleX CSS to the entry stylesheet, so the lazy editor's styles are in first-view CSS. Harmless at 1.1 kB; the prompt's "first-view CSS" budget silently becomes "all CSS" as the app grows. Dev styling worked without the `virtual:stylex.css` link the unplugin README describes.

### Load on intent

- **F-10 CONFIRMED: Query APIs.** `queryClient.query(options)` and `staleTime: 'static'` exist in 5.108.4, and `fetchQuery` / `prefetchQuery` / `ensureQueryData` are deprecated in favour of them, as the prompt's wording implies.
- **F-11 CONFIRMED: loader runs in parallel with the route chunk.** On an uncached navigation the route chunk request starts 5–6 ms after the click and the two API requests 6–8 ms after it.
- **F-12 WRONG by omission: "Query owns freshness" needs a `staleTime` the prompt never sets.** With `defaultPreloadStaleTime: 0` and Query's default `staleTime` of 0, `queryClient.query(options)` in the loader fetches on the intent preload and again on the navigation, so preloading buys nothing and "fully cached navigation ≤ 200 ms" cannot be met. Decision: `staleTime: 30_000` on every `queryOptions`. The double fetch is reasoned from Query's documented `staleTime` semantics; I did not build a `staleTime: 0` variant to measure it. With the 30 s value, the flow tests assert exactly one request per resource.
- **F-13 UNDERSPECIFIED: secondary data in the loader.** "Start critical queries in the route loader" does not say whether a secondary panel's query is critical. Decision: start it in the loader without awaiting (`void queryClient.query(...).catch(() => {})`), await only the required query.
- **F-14 CONFIRMED, instruction can be simplified: keyboard focus preloads.** `Link` already attaches an `onFocus` preload handler; the focus test passes in all three browsers on both renderers with no extra handler. In WebKit, links are only reachable with Option+Tab (macOS default), which the test accounts for.
- **F-15 CONFIRMED: lazy feature.** One shared `import()` for `React.lazy` and the hover/focus/press warm-up; the network log shows the chunk fetched once across hover → focus → click → reopen, once on a direct link, once on a cold tap. Decision: the lazy feature is an editor (form in a `createPortal` dialog) rather than a chart, because the gate requires forms and portals. "Press" is implemented as `pointerdown`. "Load rarely used tools on demand" adds nothing beyond the sentence before it (REDUNDANT).
- **F-16 UNDERSPECIFIED: `staleTime: 'static'` choice.** The prompt offers both loader forms without saying which resource gets which. Decision: list = `'static'` (cached data acceptable when returning), detail = fresh.

### Keep the first view small

- **F-17 UNDERSPECIFIED: "kB".** 1000 or 1024 bytes is not stated. Decision: 1000 (stricter). Irrelevant at these sizes.
- **F-18 UNDERSPECIFIED: what the three budgets cover.** "Cold-entry JS" and "route-specific startup JS" are not defined. Decision, in `scripts/budget.mjs`: cold-entry JS = static-import closure of the HTML entry, plus the closure of the matched route's split chunks, each file once; route-specific JS = that route closure minus the entry closure; first-view CSS = CSS of those chunks. On-demand chunks (the lazy editor) are excluded. Budgets are evaluated per route template.
- **F-19 CONFIRMED: manifest walk and cross-check.** The manifest has no sizes, as the prompt says. `modulepreload` links in the built HTML are already inside the entry closure. A Playwright test asserts the JS and CSS files in a cold browser network log equal the budget script's file set, for both routes, renderers and all browsers.
- **F-20 UNDERSPECIFIED: LCP image.** The prompt assumes the LCP element is an image. A data table has none; LCP here is text. Decision: a small logo with `<link rel="preload" as="image">` and explicit `width`/`height`, to follow the letter of the instruction. LCP itself was not measured (F-29).
- **F-21 UNDERSPECIFIED: budgets are not calibrated.** 150 kB passes at 57 kB and 95 kB. The budget cannot distinguish the renderers or catch a 50 kB regression on either. A budget relative to a recorded baseline would.
- **F-22 UNBUILDABLE here: "Fail CI".** No CI provider is named, and the `gh` token for `rp-omar` lacks the `workflow` scope, so no GitHub Actions workflow was pushed. `bun run budget` exits non-zero on a breach and is ready to wire in.

### Ship on measured results

- **F-23 WRONG: `bun lint` is not a command.** `bun fmt`, `bun check`, `bun test` and `bun ci` are Bun built-ins in 1.4.5; `bun lint` is not (E-1), and the prompt names no linter. Decision: oxlint via a `lint` script. **Corrected in run 2 (V-0):** `bun lint` is a built-in in Bun canary (`1.4.6-canary.1`) and missing only from stable 1.4.5. The defect is the stable Bun pin disagreeing with the command list, not a missing linter. Was: "`bun lint` is not a command … the prompt names no linter".
- **F-24 UNDERSPECIFIED: `bun fmt --check` needs ignores.** Out of the box it flags the generated `src/routeTree.gen.ts`, and `bun fmt` would have rewritten `PROMPT.md`. Decision: `.prettierignore` for both plus `results/` and `bun.lock`; style set in `bunfig.toml`.
- **F-25 UNDERSPECIFIED: `bun test` and Playwright collide.** Bun's runner picks up `*.spec.ts` / `*.test.ts`, which is where Playwright tests normally live. Decision: Playwright files are `*.pw.ts`; `bun test` runs unit tests only. The prompt also pins no Playwright version, and does not note that Playwright's WebKit and Firefox are test builds, not Safari and release Firefox.
- **F-26 RESULT: React Doctor static check contradicts the gate.** `react-doctor . -y --no-supply-chain --no-score` runs non-interactively and reports one warning: `prefer-html-dialog` ("Custom modal instead of dialog") on the portal dialog. The gate tells you to exercise portals; the pinned checker tells you to replace this one with `<dialog>`. Kept the portal. I passed `--no-supply-chain --no-score` so nothing was sent to Socket.dev or the score API; the prompt does not mention that the default run calls both. "Static checks on new PR findings" maps to `--scope changed --base <ref>`, which I did not exercise (no PR).
- **F-27 UNDERSPECIFIED: the gate has no numbers.** No tolerance for "improves" or "hold their baseline", no run count, no definition of "usable content", and no statement of the network and device the comparison should run on. The last one decides the outcome of "cold entry improves" (F-28). I fixed a rule before measuring (above).
- **F-28 WRONG in expectation: cold entry on a fast connection does not improve.** The prompt's premise is that a smaller runtime gives a faster cold entry. On localhost the 38 kB saving is worth almost nothing and Redact's slower render of a large first view outweighs it. On a slow network the saving would count for more. I did not measure that: `vite preview` serves uncompressed files, so a throttled run would have overstated the byte gap (308 kB vs 150 kB raw, against 95 kB vs 57 kB Brotli).
- **F-29 UNBUILDABLE here: field targets.** "Sample web-vitals/attribution by route template and release" and the p75 LCP / INP / CLS targets need production traffic and a collection endpoint. Not built. INP and CLS were not measured in the lab either; the timings here are in-page marks that all three browsers support, not Event Timing.
- **F-30 CONFIRMED: Redact caveats in the prompt are accurate, and understated.** "Rendering is synchronous" and the `useDeferredValue` caveat both show up in measurements (R-3). The prompt cites slower "Suspense retry cycles" as the risk; in this app Suspense reveal was Redact's strength (R-4) and the real cost was large-tree re-rendering (R-2), which the prompt does not flag.
- **F-31 UNDERSPECIFIED: virtualisation.** The prompt asks for "typing during filtering with realistic data" and "the largest realistic list" but names no virtualiser. Decision: render all 5,000 rows, since that is the stress case the gate describes. A virtualised list would shrink every gap in R-1 and could change the verdict; that is an app-design choice the prompt leaves open.

## Decisions not tied to a prompt defect

- Mock backend: a serve-only Vite plugin (`mock/api-plugin.ts`, `apply: 'serve'`) answering `/api/*` from a seeded generator (seed 20261125, 5,000 rows) with fixed delays of 30 / 40 / 150 / 40 ms (list / item / activity / save). It is a sixth entry in the plugin array but adds no build transforms. Rows never enter the JS bundle.
- The save endpoint echoes without mutating, so benchmark runs are repeatable.
- Git identity for this public repo is the GitHub noreply address for `rp-omar`, set repo-locally. Remote is HTTPS because the SSH key on this machine is not authorised for GitHub (`Permission denied (publickey)`).
- Playwright browsers were installed inside `node_modules` (`PLAYWRIGHT_BROWSERS_PATH=0`), not in the user cache.
- `COMPILER=off`, `PLAIN_LINKS=1` and `CHAIN=n` are diagnostic build switches used for R-2 and F-05. They are off in every measured build.

## Not run or not verified

Run 2 worked through this list; the current state is in "Still not verified after run 2" at the end. The list below is run 1's, left as written.

- `react-doctor scan` (interactive), and React Doctor's `--scope changed` mode.
- Throttled network or CPU, real devices, real Safari, release Firefox. All timings are localhost on one Apple-silicon Mac, headless, Playwright builds.
- LCP, INP, CLS, and any field data.
- CI wiring (F-22).
- The `staleTime: 0` double-fetch (F-12) and navigation from a small page (R-2) are reasoned, not measured.
- A virtualised list (F-31).
- Sequential `RENDERER` switching on a shared dep cache (F-08).

---

# Run 2 (2026-11-25): verifying the "Not run or not verified" list

Appended after run 1. Everything above is run 1 and is left as written, except where a "was:" note marks a correction. IDs in this part start with **V-**.

## Rules fixed before the run-2 measurements

- **Same gate, applied per condition.** Baseline = React DOM build of the same condition; tolerance per metric and browser = max(A/A noise in that condition, 5%); Redact ships under a condition only if cold entry improves and Suspense navigation and input latency hold, in every browser measured for that condition.
- **Measured bundles do not change.** The default builds must stay byte-identical to the ones timed in run 1 (`results/hashes/run1.sha256`). Variants are separate build outputs.
- **Conditions.**
  - `brotli`: default builds served by `scripts/serve.mjs` (pre-compressed Brotli quality 11 for files, Brotli quality 5 for API JSON) instead of `vite preview`, no throttling, three browsers. This is the control that separates "server changed" from "network changed".
  - `brotli-slow4g-cpu4`: the same, with Lighthouse's mobile slow-4G DevTools profile (562.5 ms request latency, 1,474.56 kbps down, 675 kbps up) and 4x CPU slowdown, applied through CDP. CDP exists only in Chromium, so this condition is judged on Chromium alone.
  - `virtual-brotli` and `virtual-slow4g-cpu4`: the same two, on the `VIRTUAL=1` build variant.
- **"Usable content" for the virtualised list**: the first window of rows (the rows in a 1280×800 viewport plus 10 overscan) painted, with the count reading "5,000 of 5,000". Input latency is keystroke to that window repainted with the filtered rows.
- Decision: run counts stay at 9 (5 typing runs × 10 keystrokes) for every condition.

## Run 2 results: checks that are not timings

### V-0 Toolchain: `bun lint` is a Bun canary built-in (corrects F-23)

- Measured: Bun stable 1.4.5 has no `lint` subcommand. Bun canary (`bun@1.4.5-canary.20261124.1`, `bun --revision` → `1.4.6-canary.1+bd92f9bef`) lists `lint`, `fmt`, `check`, `test` in `bun --help`. Canary was installed in a scratch directory outside the repo and run against a fresh clone.
- With a `lint` script in `package.json`, canary's `bun lint` still runs the script (`$ oxlint src mock scripts tests`); `bun lint --no-script` runs the built-in. The built-in is clean on this repo (22 files, 96 rules native, oxlint defaults) and does report problems: a probe file gave `eslint(no-debugger)` and `eslint(no-unused-vars)`.
- `bun fmt --check`, `bun check`, `bun test` and both builds pass on canary.
- **Bundles did not change.** `bun run build:*` on canary runs Vite under Node, and the output is byte-identical to run 1 (all 25 files, sha256). Only `bun --bun run build:redact` (Vite on the Bun runtime) differs: different chunk hashes, 2 bytes larger in total.
- Decision: the repo stays pinned to stable 1.4.5, because the `PROMPT.md` under evaluation says "Bun 1.4.5 (stable)" and the run-1 numbers were taken on it. The parent session reports that the original prompt pinned canary and that the stable pin came from a rewrite; I could not check the original. Either way the prompt edit is the same: the Bun pin and the command list must agree.

### V-3a `staleTime: 0` double fetch (was reasoned in F-12): MEASURED, confirmed

`STALE=0` build variant, hover a row link (intent preload), wait, click. Requests counted by Playwright, identical in Chromium, Firefox and WebKit and on both renderers ([results/raw/verify](results/raw/verify)):

| Requests                                               | `staleTime: 30 s` (as built) | `staleTime: 0` (Query default) |
| ------------------------------------------------------ | ---------------------------: | -----------------------------: |
| `/api/items/1000` after preload → after click          |                        1 → 1 |                      1 → **2** |
| `/api/items/1000/activity` after preload → after click |                        1 → 1 |                      1 → **2** |
| `/api/items` after returning to the list               |                            1 |                          **2** |
| route chunk                                            |                            1 |                              1 |

So with the prompt as written (no `staleTime`), the intent preload is thrown away and every navigation fetches again. The third row is a second defect: `staleTime: 'static'` in the list loader does not stop the refetch, because the component's `useSuspenseQuery` uses the shared options (`staleTime: 0`) and refetches on mount. "Use `staleTime: 'static'` in the loader" only works if the component's options are not stale either.

### V-3b Sequential `RENDERER` switching on a shared dep cache (F-08): MEASURED, works

`VITE_CACHE=shared`, one dev server at a time: Redact → React DOM → Redact → React DOM (`scripts/verify-cache-switch.mjs`). All four starts rendered 5,000 rows with the right renderer and no console errors; Vite re-optimised dependencies on each switch. The `Invalid hook call` failure (E-6) therefore needs both dev servers running at the same time on one cache. The per-renderer `cacheDir` is still the right fix for that case, and it also avoids the re-optimise on every switch.

### V-5 Real browsers

- **Google Chrome 158.0.8127.37 (installed)**: driven by Playwright `channel: 'chrome'`. Timings in the tables below.
- **Firefox 150.0.1 (installed release)**: Playwright cannot drive a stock Firefox, so it was driven over WebDriver with geckodriver 0.37.1 (downloaded by the `geckodriver` npm package into `node_modules/.cache`), headless, one fresh profile per measurement. WebDriver has no init-script hook, so `scripts/serve.mjs --inject-marks` puts the timing marks into `index.html`. Timings below.
- **Safari 26.5: could not run.** `safaridriver` started, and the session request failed with: `Could not create a session: You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.` I did not change the setting. Human step is in the README.

### V-6 `react-doctor scan`: ran unattended

- `react-doctor scan <url>` exits with `` `react-doctor scan <url>` requires an interactive terminal `` when stdin is not a terminal. `script(1)` did not help (`script: tcgetattr/ioctl: Operation not supported on socket`). Running it on a pseudo-terminal from Python's `pty` module works: `scripts/doctor-scan.mjs` starts Chromium with a debugging port, runs the scan with `--cdp`, drives one interaction with Playwright (type five characters in the filter, click the first row), then writes Enter. Reports and traces are in `.doctor/`, which is git-ignored.
- **On the Redact build the scan sees no React**: `"reactDetected": false`, warning `No React renderer was detected during the recording.`, no component data. It still reports long frames and script hotspots (the `oninput` handler, 925 ms over 5 frames).
- **On the React DOM build** it detects React 19.3.1 (production), warns `React component timings were unavailable. Production builds require react-dom/profiling.`, and its own instrumentation slows the page badly: worst interaction 5,696 ms, against about 42 ms for the same keystrokes without the scan. Redact's worst interaction in its scan was 360 ms.
- Consequences for the prompt: the scan's numbers cannot be compared across renderers (one is instrumented and the other is invisible), component-level output needs a `react-dom/profiling` build that the prompt does not ask for, and the command needs a terminal, so "run on a schedule or for performance work" cannot be a plain CI step.

### V-7 Fresh-clone install: works

`git clone https://github.com/rp-omar/redact-prompt-eval` at `602a19d`, then the README line (`npm install --no-package-lock --save-dev --save-exact bun@1.4.5 && ./node_modules/.bin/bun ci`): 25 s, working tree left clean. In that clone `bun lint`, `bun fmt --check`, `bun check`, `bun test`, `bun run build:both` and `bun run budget` (12/12) pass, and the two builds are byte-identical to the ones measured in run 1. npm prints `bun@1.4.5 (postinstall: node install.js)` as an unapproved install script; the binary works without it.

### V-8 CI: written, not enabled

`ci/github-actions-ci.yml` runs the prompt's command list, both builds, the budget script, the flow tests and the React Doctor static check. It is stored outside `.github/workflows/` because the `gh` token has no `workflow` scope, and granting that is Omar's action. It has never run, so it is unverified. Human step is in the README.

## Run 2 results: timings

All medians in ms (min–max), 9 runs, Redact vs React DOM, Δ relative to React DOM. Full tables with A/A noise: `results/summary-<condition>.md`. "Chrome" is the installed Google Chrome 158; the other three are Playwright builds.

### V-1 Real Brotli, then slow 4G + 4x CPU: verdict holds, cold entry becomes a tie

**Control, `brotli` (unthrottled, [results/summary-brotli.md](results/summary-brotli.md)).** Serving Brotli instead of uncompressed files changes nothing on localhost; every number is within noise of run 1.

| Metric                          |          Chromium |            Firefox |            WebKit |            Chrome |
| ------------------------------- | ----------------: | -----------------: | ----------------: | ----------------: |
| Cold entry → 5,000 rows painted | 382 vs 337 (+13%) |  473 vs 389 (+22%) |  668 vs 662 (+1%) |  424 vs 391 (+9%) |
| Warm navigation                 | 132 vs 65 (+103%) |  218 vs 74 (+195%) |   89 vs 59 (+51%) |  141 vs 72 (+97%) |
| Suspense navigation             |  167 vs 92 (+82%) | 268 vs 123 (+118%) | 148 vs 116 (+28%) |  175 vs 93 (+88%) |
| Input latency                   | 131 vs 44 (+195%) |  287 vs 77 (+275%) |   93 vs 58 (+60%) | 141 vs 45 (+212%) |

Gate: fails, same as run 1. Installed Chrome agrees with Playwright's Chromium.

**`brotli-slow4g-cpu4` (Chromium only, [results/summary-brotli-slow4g-cpu4.md](results/summary-brotli-slow4g-cpu4.md)).**

| Metric                          |           Redact |        React DOM |            Δ |
| ------------------------------- | ---------------: | ---------------: | -----------: |
| Cold entry → 5,000 rows painted | 4047 (3956–4158) | 4105 (3977–4203) | −1% (A/A 1%) |
| Warm navigation                 |    425 (392–467) |    173 (156–216) |        +146% |
| Suspense navigation             |   981 (970–1005) |    730 (720–749) |         +34% |
| Input latency                   |    557 (532–582) |    168 (159–181) |        +231% |

- Gate: fails. Cold entry is a tie (−1% against a 5% tolerance), and both interactions are far outside tolerance. **Verdict holds: ship React DOM.**
- Why the 38 kB saving buys so little: the list response is 1,050,142 B raw and 108,009 B with Brotli, larger than either renderer's whole JS (57 kB / 95 kB). On slow 4G the data dominates the cold entry, and at 4x CPU Redact's slower first render of 5,000 rows uses up what the smaller download saved. This corrects the expectation in F-28: a slow network alone does not make cold entry improve for this page.
- Not measured: throttled Firefox or WebKit. Playwright exposes network and CPU throttling only through CDP, which is Chromium-only.

### V-2 Virtualised list: the gap closes; the strict gate still fails, on 1–4 ms

`VIRTUAL=1` swaps the index route for `src/variants/index.virtual.tsx` (TanStack Virtual 3.14.28, `useWindowVirtualizer`, fixed 50 px rows, overscan 10) through a Vite `load` hook, so the default bundles stay byte-identical to run 1. Same data, same filter and sort, same row markup. Flow coverage for this variant is the benchmark's own assertions (rows painted, filter, navigation), not the 54-test flow suite.

- **Build finding: React Compiler 1.0.0 silently breaks TanStack Virtual.** With the compiler on, the rendered window never moves on scroll, on both renderers: the compiler memoises `virtualizer.getVirtualItems()` on the stable virtualizer instance. No build error, no runtime error. `'use no memo'` in the component fixes it, and `COMPILER=off` works without it. The prompt requires both the compiler and (by implication of its own caveat) a way to keep large lists cheap, and does not mention the conflict.
- Budgets pass ([results/budget-virtual.json](results/budget-virtual.json)): cold-entry JS for `/` is 67.0 kB on Redact and 105.2 kB on React DOM (+9.7 kB for the virtualiser on both); route JS for `/` is 14.1 kB.

**`virtual-brotli` ([results/summary-virtual-brotli.md](results/summary-virtual-brotli.md)).** "Usable content" is the first window of rows painted.

| Metric                            |          Chromium |           Firefox |            WebKit |            Chrome |
| --------------------------------- | ----------------: | ----------------: | ----------------: | ----------------: |
| Cold entry → first window painted |    74 vs 79 (−7%) |    87 vs 92 (−5%) |    79 vs 82 (−4%) |    75 vs 82 (−9%) |
| Warm navigation                   |    38 vs 39 (−4%) |   14 vs 16 (−13%) |   15 vs 12 (+25%) |     43 vs 43 (0%) |
| Suspense navigation               |   58 vs 65 (−11%) |     59 vs 59 (0%) |    64 vs 63 (+2%) |    65 vs 61 (+6%) |
| Input latency                     | 8.1 vs 6.8 (+19%) | 8.0 vs 6.0 (+33%) | 9.5 vs 8.5 (+12%) | 7.4 vs 6.3 (+18%) |

**`virtual-slow4g-cpu4` (Chromium only, [results/summary-virtual-slow4g-cpu4.md](results/summary-virtual-slow4g-cpu4.md)).**

| Metric                            |           Redact |        React DOM |            Δ |
| --------------------------------- | ---------------: | ---------------: | -----------: |
| Cold entry → first window painted | 2804 (2791–2816) | 3023 (3009–3054) | −7% (A/A 0%) |
| Cold entry, detail route          | 2133 (2118–2146) | 2357 (2349–2371) |          −9% |
| Warm navigation                   |       50 (46–68) |       46 (42–52) |          +9% |
| Suspense navigation               |    619 (614–627) |    621 (613–627) |           0% |
| Input latency                     |       16 (16–18) |       12 (12–15) |         +36% |

- **Gate as fixed before the run: fails in both conditions, so the written verdict does not flip.** Unthrottled: cold entry improves in three of four browsers (WebKit −4% is inside the 5% tolerance), Suspense navigation holds except Chrome (+6%, 4 ms), and input latency is over tolerance in three browsers. Throttled: cold entry improves (−7%, about 220 ms) and Suspense navigation holds; input latency fails at +36%.
- **What the rule hides:** every failing difference is 1 to 4 ms, below one 60 Hz frame (16.7 ms), and no user can see it. The percentage tolerance was written for the 5,000-row numbers and is too strict at this scale. Read in absolute terms, the virtualised app is the case where Redact is the reasonable choice: about 220 ms faster cold entry on slow 4G, 38 kB less JS, interactions equal to the eye. I did not change the rule after seeing the numbers; a gate meant to cover this case needs an absolute floor (for example "or under 16 ms") stated up front.
- So the answer to "does the verdict change": **not by the pre-registered rule; yes in substance.** Run 1's caveat F-31 is confirmed: the verdict depends on whether the list is virtualised, which the prompt leaves open.

### V-3c Navigation from a small page (was reasoned in R-2): MEASURED, confirmed

New benchmark scenario: start on `/about` (a page with a few nodes), navigate to the detail route through the router, cold and preloaded. Same detail route, loaders and API delays as the list → detail navigation.

| Cold navigation → required content |  Chromium |    Firefox |     WebKit |    Chrome |
| ---------------------------------- | --------: | ---------: | ---------: | --------: |
| From the 5,000-row list            | 167 vs 92 | 268 vs 123 | 148 vs 116 | 175 vs 93 |
| From `/about`                      |  64 vs 65 |   63 vs 63 |   63 vs 65 |  64 vs 62 |

- From a small page the two renderers are equal (and stay equal at slow 4G + 4x CPU: 643 vs 646). The whole navigation regression in R-1 is the cost of leaving the 5,000-row view, as R-2 argued.
- The secondary panel from `/about` paints at 163–177 ms on Redact against 359–372 ms on React DOM in all four browsers (R-4 again: React DOM throttles the Suspense reveal).
- Preloaded navigation from `/about`: 13–19 ms on both; differences of 0–5 ms.

### V-4 LCP, INP, CLS in the lab: MEASURED (`web-vitals/attribution` 6.2.3)

The attribution build is injected by Playwright as an init script, so the bundles under test are unchanged. `reportAllChanges` on; values read after an emulated `visibilitychange` to hidden. 5 runs per renderer, medians, Redact vs React DOM. Raw: `results/raw/verify/vitals-*.json` (with the last attribution object per metric).

| Metric (ms)                         | Chromium 159 |  Firefox 159 |  WebKit 27.2 | Chrome 158 |
| ----------------------------------- | -----------: | -----------: | -----------: | ---------: |
| LCP, list cold entry                |   396 vs 372 |   440 vs 377 |   688 vs 680 | 440 vs 408 |
| LCP, detail cold entry              |     76 vs 80 |     69 vs 77 |     72 vs 77 |   76 vs 92 |
| INP, typing in the 5,000-row filter |    232 vs 72 |   592 vs 368 |    128 vs 56 |  216 vs 80 |
| INP, list → detail click            |     24 vs 24 |     24 vs 24 |     24 vs 48 |   32 vs 32 |
| CLS, all three scenarios            |       0 vs 0 | not reported | not reported |     0 vs 0 |
| Virtualised: LCP, list cold entry   |    80 vs 100 |     69 vs 75 |     88 vs 92 |   92 vs 96 |
| Virtualised: INP, typing            |     48 vs 48 |      16 vs 8 |       8 vs 8 |   48 vs 48 |

Slow 4G + 4x CPU, Chromium, default build: list LCP 3972 vs 4044; detail LCP 2140 vs 2368 (−10%); typing INP 744 vs 208; click INP 80 vs 96; CLS 0 on both.

- **Which browser reported which metric (observed, not from documentation):** LCP, FCP, TTFB and INP were reported by all four. CLS was reported only by Chromium and Chrome; the Playwright Firefox 159 and WebKit 27.2 builds never called the CLS callback. Vitals were not collected in release Firefox (WebDriver run records marks only) or Safari (blocked).
- The vitals agree with the in-page marks: on the 5,000-row list Redact's typing INP is about 3x React DOM's in Chromium and over the 200 ms "good" threshold in Chromium, Chrome and Firefox (React DOM is also over it in Firefox). INP attribution puts it in processing time (about 200 ms on Redact against 33–39 ms on React DOM; input delay under 1 ms on both), which matches R-2. With the list virtualised INP is equal or within one 8 ms tick.
- LCP on a small first view (detail route, virtualised list) is lower on Redact in every browser, by 4 to 20 ms unthrottled and 228 ms on slow 4G. LCP on the 5,000-row list is higher on Redact unthrottled and a tie throttled.
- CLS is 0 everywhere it is reported, including across the Suspense panel reveal.
- The LCP element on the list is the header logo `<img>`, not a row, with almost all of its time in element render delay (about 380 of 396 ms): the logo first paints in the same commit as the rows.
- These are lab values on one machine, n = 5. They are not the p75 field targets (F-29), which still need production traffic.

### V-5 timings: installed Chrome and release Firefox

- **Chrome 158** is the fourth column in V-1, V-2, V-3c and V-4. It agrees with Playwright's Chromium in direction and size everywhere.
- **Firefox 150.0.1 release** (WebDriver, default build, Brotli, unthrottled, 9 runs; [results/summary-real-browsers.md](results/summary-real-browsers.md)): cold entry 493 (478–565) vs 435 (421–448), +13%; Suspense navigation 304 (289–324) vs 111 (101–238), +174%; input latency 308 (301–324) vs 80 (71–113), +287%; secondary panel 316 vs 396 (−20%). Gate fails. Same picture as Playwright's Firefox build (+22%, +118%, +275%). Warm navigation and the small-page scenario were not scripted for the WebDriver run.
- **Safari**: not measured (V-5 above).

## Run 2: verdict per condition

Rule as fixed before the run. "Holds" means the run-1 verdict (ship React DOM) stands.

| Condition                     | Browsers                          | Cold entry improves        | Interactions hold  | Verdict                                            |
| ----------------------------- | --------------------------------- | -------------------------- | ------------------ | -------------------------------------------------- |
| Brotli, unthrottled           | Chromium, Firefox, WebKit, Chrome | no (+1% to +22%)           | no                 | holds                                              |
| Brotli, slow 4G + 4x CPU      | Chromium                          | no (−1%, inside tolerance) | no (+34%, +231%)   | holds                                              |
| Release Firefox 150           | Firefox                           | no (+13%)                  | no (+174%, +287%)  | holds                                              |
| Virtualised, unthrottled      | Chromium, Firefox, WebKit, Chrome | 3 of 4 (WebKit −4%)        | no, by 1–4 ms      | holds by the rule; a tie in absolute terms         |
| Virtualised, slow 4G + 4x CPU | Chromium                          | yes (−7%, 220 ms)          | no, by 4 ms (+36%) | holds by the rule; Redact better in absolute terms |

Run 1's verdict for the app as specified (unvirtualised list) stands under every condition measured. The one thing that would change the decision is a product choice, not a measurement condition: virtualise the list and add an absolute floor to the gate, and Redact passes on slow 4G.

## Run 2: decisions and one incident

- Decision: variants are separate build outputs (`dist-*-virtual`, `dist-*-stale0`) selected by `VARIANT`, so the default bundles stay byte-identical to run 1. Checked again after all run-2 changes: 25 of 25 files match `results/hashes/run1.sha256`.
- Decision: throttling profile is Lighthouse's mobile slow 4G with DevTools (request-level) throttling and 4x CPU, because it is the most widely quoted "slow" lab profile and the prompt names none.
- Decision: release Firefox through selenium-webdriver 4.54.0 and the `geckodriver` npm package, both devDependencies, driver binary kept in `node_modules/.cache`.
- Decision: no new unit tests for the run-2 scripts; they are measurement harness, and their output is the check.
- **Incident: an accidental `pnpm install` in the repo during the vitals run.** This machine's shell aliases `ps` to `pnpm start`. Two process checks I ran as `ps aux | grep …` therefore ran `pnpm start` in the repo at 11:37, which auto-installed: it wrote `pnpm-lock.yaml` and `pnpm-workspace.yaml`, relinked `node_modules` into pnpm's layout, and added packages to the pnpm store under `~/Library/pnpm` (outside the repo; left as is). Effect on results: the four timing conditions and the Chromium vitals had finished before 11:37 and are untouched; the Firefox vitals in flight were discarded. Recovery: stopped the chain, deleted the two pnpm files, removed `node_modules`, reinstalled with the README line (Playwright browsers and the geckodriver binary were moved aside and back, not re-downloaded), rebuilt, confirmed all default and virtual bundles byte-identical to the recorded hashes, then reran every vitals condition and the release-Firefox run from scratch. Nothing from the pnpm install is committed.

## Still not verified after run 2

- **Safari.** Blocked on a Safari setting (README, human step 1).
- **CI.** Workflow file written, never run (README, human step 2).
- Throttled Firefox and WebKit: no throttling API outside Chromium in Playwright. Real devices.
- Field data: p75 LCP / INP / CLS and web-vitals sampling by route and release (F-29).
- React Doctor `--scope changed` (no PR), and component-level `scan` output (needs a `react-dom/profiling` build; cannot exist for Redact).
- The 54-test flow suite on the virtualised variant; it was exercised only by the benchmark and vitals scenarios.
- Vitals in release Firefox; warm navigation in release Firefox.
- The original prompt's Bun canary pin (reported by the parent session, not seen).
