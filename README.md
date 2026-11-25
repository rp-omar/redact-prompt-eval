# redact-prompt-eval

A minimal app built from [PROMPT.md](PROMPT.md) ("Build a fast client-rendered React app") to evaluate the prompt and its stack. The app is the test rig; the findings are the deliverable. Full log: [FINDINGS.md](FINDINGS.md).

Stack as pinned by the prompt: TanStack Redact 0.3.1 (React DOM 19.3.1 as fallback), Vite 8.3.8, React Compiler 1.0.0, TypeScript 7.0.2, TanStack Router 1.170.46, TanStack Query 5.108.4, StyleX 0.19.2, Bun 1.4.5.

## Verdict

**Ship React DOM. Redact fails the prompt's own gate.** The gate is "ship Redact when cold entry improves and those interactions hold their baseline". Cold entry does not improve in any browser, and Suspense navigation and input latency are slower in all three. No required flow broke on Redact (54/54 flow tests pass on both renderers), and Redact is 40% smaller.

This holds for the app as built: an unvirtualised 5,000-row list, measured on localhost. A virtualised list or a slow network could change it; neither was measured (see "Not verified"). **Run 2 measured both: see the next section.**

## Run 2: verdict under each new condition (new, 2026-11-25)

Run 2 verified the "Not verified" list. Everything in "Redact vs React DOM" below is run 1 and unchanged; the default bundles measured in run 2 are byte-identical to run 1's. Same gate, tolerance max(A/A noise, 5%), 9 runs. Detail: FINDINGS.md V-0 to V-8.

| Condition                                                         | Cold entry (Redact vs React DOM) |   Suspense navigation |                 Input latency | Gate            | Verdict                                      |
| ----------------------------------------------------------------- | -------------------------------: | --------------------: | ----------------------------: | --------------- | -------------------------------------------- |
| Real Brotli, unthrottled, 4 browsers (incl. installed Chrome 158) |                      +1% to +22% |         +28% to +118% |                 +60% to +275% | fails           | holds: React DOM                             |
| Real Brotli, slow 4G + 4x CPU, Chromium                           |       4047 vs 4105 ms (−1%, tie) |  981 vs 730 ms (+34%) |         557 vs 168 ms (+231%) | fails           | holds: React DOM                             |
| Virtualised list, unthrottled, 4 browsers                         |   74–87 vs 79–92 ms (−4% to −9%) |  −11% to +6% (≤ 4 ms) | 7–10 vs 6–9 ms (+12% to +33%) | fails on 1–4 ms | holds on paper; a tie in practice            |
| Virtualised list, slow 4G + 4x CPU, Chromium                      |            2804 vs 3023 ms (−7%) |         619 vs 621 ms |            16 vs 12 ms (+36%) | fails on 4 ms   | holds on paper; Redact is better in practice |
| Release Firefox 150.0.1 (WebDriver), unthrottled                  |             493 vs 435 ms (+13%) | 304 vs 111 ms (+174%) |          308 vs 80 ms (+287%) | fails           | holds: React DOM                             |

- **Unvirtualised list: ship React DOM, under every condition.** Slow 4G does not rescue Redact: the list JSON (108 kB Brotli) outweighs the 38 kB of JS saved, so cold entry is a tie and the interaction gaps stay.
- **Virtualised list: the pre-registered gate still says React DOM, but only because a 5% tolerance on a 6–12 ms input latency is 1–4 ms**, less than one frame. In absolute terms Redact wins there: about 220 ms faster cold entry on slow 4G, 38 kB less JS, interactions equal to the eye. The gate needs an absolute floor before it can decide this case; I did not move it after seeing the numbers.
- Navigation from a small page is equal on both renderers (64 vs 65 ms), so the navigation regression is the cost of leaving the 5,000-row view.
- Throttling was Chromium-only (CDP). Slow profile: Lighthouse mobile slow 4G (562.5 ms latency, 1,474.56 kbps down, 675 kbps up) and 4x CPU.

Lab vitals (`web-vitals/attribution`, 5 runs, Redact vs React DOM, ms):

| Metric                              |   Chromium |      Firefox |       WebKit |     Chrome |
| ----------------------------------- | ---------: | -----------: | -----------: | ---------: |
| LCP, list cold entry                | 396 vs 372 |   440 vs 377 |   688 vs 680 | 440 vs 408 |
| LCP, detail cold entry              |   76 vs 80 |     69 vs 77 |     72 vs 77 |   76 vs 92 |
| INP, typing in the 5,000-row filter |  232 vs 72 |   592 vs 368 |    128 vs 56 |  216 vs 80 |
| INP, typing, virtualised list       |   48 vs 48 |      16 vs 8 |       8 vs 8 |   48 vs 48 |
| CLS                                 |     0 vs 0 | not reported | not reported |     0 vs 0 |

LCP and INP were reported by all four browsers; CLS only by Chromium and Chrome. On slow 4G + 4x CPU (Chromium): list LCP 3972 vs 4044, typing INP 744 vs 208.

## Redact vs React DOM (run 1)

Same commit, production builds, `vite preview` on localhost. Bytes are Brotli, kB = 1000 B. Timings are median ms (min–max) over 9 runs; input latency is the median keystroke over 5 runs × 10 keystrokes.

| Measure                                                        |              |        Redact |     React DOM |     Δ |
| -------------------------------------------------------------- | ------------ | ------------: | ------------: | ----: |
| Cold-entry JS (budget 150 kB)                                  | `/`          |     57.3 kB ✓ |     95.4 kB ✓ |  −40% |
|                                                                | `/items/$id` |     57.2 kB ✓ |     95.3 kB ✓ |  −40% |
| Route-specific startup JS (budget 50 kB)                       | `/`          |      4.4 kB ✓ |      4.4 kB ✓ |   −1% |
|                                                                | `/items/$id` |      4.3 kB ✓ |      4.3 kB ✓ |   −1% |
| First-view CSS (budget 20 kB)                                  | both routes  |      1.1 kB ✓ |      1.1 kB ✓ |    0% |
| Cold entry → usable content (list, 5,000 rows painted)         | Chromium     | 383 (372–399) | 338 (334–342) |  +14% |
|                                                                | Firefox      | 462 (449–587) | 378 (375–385) |  +22% |
|                                                                | WebKit       | 657 (637–719) | 649 (624–670) |   +1% |
| Warm navigation → visible content (preloaded, click → painted) | Chromium     | 132 (127–136) |    65 (54–69) | +104% |
|                                                                | Firefox      | 209 (202–225) |    71 (65–73) | +194% |
|                                                                | WebKit       |    84 (79–91) |    56 (48–57) |  +50% |
| Suspense navigation (cold click → required content painted)    | Chromium     | 166 (152–201) |   95 (93–103) |  +75% |
|                                                                | Firefox      | 263 (250–281) | 129 (115–135) | +104% |
|                                                                | WebKit       | 141 (137–146) | 111 (102–115) |  +27% |
| Input latency (keystroke → filtered rows painted, 5,000 rows)  | Chromium     | 127 (125–136) |    42 (39–42) | +201% |
|                                                                | Firefox      | 277 (272–303) |    77 (74–80) | +262% |
|                                                                | WebKit       |    94 (90–99) |    59 (57–60) |  +60% |

Noise floor: two identical React DOM previews differ by 0–4% on these metrics. Browsers: Playwright 1.65.1 builds of Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2. More measures and the gate arithmetic: [results/summary.md](results/summary.md).

Why Redact loses: re-rendering 5,000 rows with nothing changed costs about 145 ms on Redact against 6 ms on React DOM, with zero DOM mutations on either. It is the same with the React Compiler off and with plain `<a>` in place of router links. Where it wins: the secondary Suspense panel paints about 200 ms sooner, because React DOM throttles the reveal. Details in FINDINGS.md R-2 to R-4.

## Edits the prompt needs

1. **Give the gate numbers.** State the tolerance, run count, what "usable content" means, and the network and device profile. As written, "improves" and "hold their baseline" are undecidable, and whether cold entry improves depends entirely on the unstated network.
2. **Warn about large trees, not only Suspense retries.** The Redact caveat should say: re-rendering a large list is far slower than React DOM and `useDeferredValue` will not keep input responsive, so virtualise long lists or pick React DOM. State whether lists must be virtualised.
3. **Set a `staleTime`.** "Query owns freshness" with `defaultPreloadStaleTime: 0` and Query's default `staleTime: 0` should refetch on navigation right after the intent preload (reasoned from Query's `staleTime` semantics, not measured; this build uses 30 s). Name a value, and say whether secondary queries start in the loader un-awaited. _Run 2: measured. With `staleTime: 0` the item and its activity are fetched twice (preload, then click), and the list is fetched again on return even with `staleTime: 'static'` in the loader, because the component's query options are still stale._
4. **Make the renderer switch complete.** Add: separate `outDir` per renderer, separate Vite `cacheDir` per renderer (sharing one broke the Redact dev server with `Invalid hook call`), and a test proving which renderer is in the bundle.
5. **Fix the command list.** ~~`bun lint` is not a Bun command; name a linter and the script.~~ _Run 2 correction: `bun lint` is a built-in in Bun canary (1.4.6-canary.1) and absent from stable 1.4.5, which this `PROMPT.md` pins. Make the Bun pin and the command list agree: pin the canary, or name a lint script. Note that a `lint` script shadows the built-in unless you pass `--no-script`._ Say which files `bun fmt --check` must ignore (generated route tree), and keep Playwright tests out of `bun test`'s `*.spec.ts` / `*.test.ts` pattern.
6. **List every package.** Add `@stylexjs/stylex`, `@babel/core`, `@playwright/test`, `web-vitals`, `@types/*` with versions, and say that `reactCompilerPreset` comes from `@vitejs/plugin-react`. Drop `runtimeInjection: false` (the default) and the implied position of `redact()` (it runs `enforce: 'pre'`).
7. **Define the budgets.** kB = 1000 or 1024; exactly which chunks count as cold-entry and route-specific JS; and note that StyleX emits one CSS file, so "first-view CSS" is all CSS. 150 kB is 1.6× to 2.6× what this stack needs, so it catches nothing; budget against a recorded baseline.
8. **Separate lab from field.** p75 LCP / INP / CLS and web-vitals sampling cannot be verified before launch. Split them from the lab gate, name the CI provider, and reconcile the gate ("exercise portals") with React Doctor's `prefer-html-dialog` warning.
9. **Add a product spec.** The prompt has none; routes, data and the lazy feature had to come from elsewhere.
10. **(Run 2) Say how the React Compiler and a virtualiser coexist.** With React Compiler 1.0.0 on, TanStack Virtual 3.14.28 stops updating on scroll, silently, on both renderers. The component needs `'use no memo'`.
11. **(Run 2) Give the gate an absolute floor.** A percentage tolerance fails Redact on a 1–4 ms difference once the list is virtualised. Add "or under one frame (16 ms)".
12. **(Run 2) Scope `react-doctor scan`.** It needs an interactive terminal, sees no React at all on a Redact build, and needs a `react-dom/profiling` build for component timings on React DOM. It cannot compare the renderers or run as a plain CI step.

## Not verified

Run 1's list, with what run 2 did to each item:

- ~~`react-doctor scan`~~ Ran (through a pseudo-terminal, `--cdp`). Redact build: no React detected.
- ~~Throttled network or CPU~~ Measured, Chromium only. ~~Release Firefox~~ Measured (150.0.1). Installed Chrome measured too. **Still open: Safari** (human step 1), throttled Firefox and WebKit (no throttling API outside Chromium), real devices.
- ~~LCP, INP, CLS~~ Measured in the lab with `web-vitals/attribution`. **Still open: field data.**
- **Still open: CI.** Workflow written at `ci/github-actions-ci.yml`, never run (human step 2).
- ~~A virtualised list, navigation from a small page, the `staleTime: 0` double fetch~~ All measured.
- ~~The install line below from a fresh clone~~ Works (25 s; builds byte-identical).

## Human steps

Each is independent. No reply needed unless a step fails.

**1. Let WebDriver control Safari** (unblocks the Safari timings). The run stopped at: `Could not create a session: You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.`

1. Open Safari → Settings. If there is no Developer tab, go to Advanced and tick "Show features for web developers" (location recalled, not checked on this machine).
2. In the Developer tab, tick "Allow remote automation" (the name the error gives).
3. Nothing to paste anywhere. No Safari benchmark script is committed yet: ask a session to port `scripts/real-firefox.mjs` to `safaridriver` and run it.

**2. Enable CI** (the `gh` token has no `workflow` scope, so the workflow file could not be pushed to `.github/workflows/`).

```bash
gh auth refresh -h github.com -s workflow
```

```bash
mkdir -p .github/workflows && git mv ci/github-actions-ci.yml .github/workflows/ci.yml && git commit -m "Enable CI" && git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main
```

The first run is the verification; it has never run.

## Run it

Bun 1.4.5 is a devDependency, so no global install is needed.

```bash
npm install --no-package-lock --save-dev --save-exact bun@1.4.5 && ./node_modules/.bin/bun ci
```

Then, with `./node_modules/.bin` on `PATH`:

| Command                                                | Does                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `bun run dev` / `RENDERER=react-dom bun run dev`       | Dev server, either renderer                                            |
| `bun run build:both`                                   | Production builds into `dist-redact` and `dist-react-dom`              |
| `bun run budget`                                       | Byte budgets from the Vite manifests; exits 1 on a breach              |
| `bun run playwright:install`                           | Chromium, Firefox, WebKit into `node_modules`                          |
| `bun run test:flows`                                   | Required flows, both renderers; run 2 adds installed Chrome (72 tests) |
| `bun run bench && bun run report`                      | Timings into `results/raw`, tables into `results/summary.md`           |
| `bun lint`, `bun fmt --check`, `bun check`, `bun test` | The prompt's checks                                                    |
| `bun run doctor`                                       | React Doctor static check, offline flags                               |

Layout: `src/` app, `mock/` seeded data and the serve-only API plugin, `scripts/budget.mjs`, `scripts/report.mjs`, `tests/flows.pw.ts`, `tests/bench.pw.ts`, `results/`.
