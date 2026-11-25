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

- **F-23 WRONG: `bun lint` is not a command.** `bun fmt`, `bun check`, `bun test` and `bun ci` are Bun built-ins in 1.4.5; `bun lint` is not (E-1), and the prompt names no linter. Decision: oxlint via a `lint` script.
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

- `react-doctor scan` (interactive), and React Doctor's `--scope changed` mode.
- Throttled network or CPU, real devices, real Safari, release Firefox. All timings are localhost on one Apple-silicon Mac, headless, Playwright builds.
- LCP, INP, CLS, and any field data.
- CI wiring (F-22).
- The `staleTime: 0` double-fetch (F-12) and navigation from a small page (R-2) are reasoned, not measured.
- A virtualised list (F-31).
- Sequential `RENDERER` switching on a shared dep cache (F-08).
