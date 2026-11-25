# redact-prompt-eval

A minimal app built from [PROMPT.md](PROMPT.md) ("Build a fast client-rendered React app") to evaluate the prompt and its stack. The app is the test rig; the findings are the deliverable. Full log: [FINDINGS.md](FINDINGS.md).

Stack as pinned by the prompt: TanStack Redact 0.3.1 (React DOM 19.3.1 as fallback), Vite 8.3.8, React Compiler 1.0.0, TypeScript 7.0.2, TanStack Router 1.170.46, TanStack Query 5.108.4, StyleX 0.19.2, Bun 1.4.5.

## Verdict

**Ship React DOM. Redact fails the prompt's own gate.** The gate is "ship Redact when cold entry improves and those interactions hold their baseline". Cold entry does not improve in any browser, and Suspense navigation and input latency are slower in all three. No required flow broke on Redact (54/54 flow tests pass on both renderers), and Redact is 40% smaller.

This holds for the app as built: an unvirtualised 5,000-row list, measured on localhost. A virtualised list or a slow network could change it; neither was measured (see "Not verified").

## Redact vs React DOM

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
3. **Set a `staleTime`.** "Query owns freshness" with `defaultPreloadStaleTime: 0` and Query's default `staleTime: 0` should refetch on navigation right after the intent preload (reasoned from Query's `staleTime` semantics, not measured; this build uses 30 s). Name a value, and say whether secondary queries start in the loader un-awaited.
4. **Make the renderer switch complete.** Add: separate `outDir` per renderer, separate Vite `cacheDir` per renderer (sharing one broke the Redact dev server with `Invalid hook call`), and a test proving which renderer is in the bundle.
5. **Fix the command list.** `bun lint` is not a Bun command; name a linter and the script. Say which files `bun fmt --check` must ignore (generated route tree), and keep Playwright tests out of `bun test`'s `*.spec.ts` / `*.test.ts` pattern.
6. **List every package.** Add `@stylexjs/stylex`, `@babel/core`, `@playwright/test`, `web-vitals`, `@types/*` with versions, and say that `reactCompilerPreset` comes from `@vitejs/plugin-react`. Drop `runtimeInjection: false` (the default) and the implied position of `redact()` (it runs `enforce: 'pre'`).
7. **Define the budgets.** kB = 1000 or 1024; exactly which chunks count as cold-entry and route-specific JS; and note that StyleX emits one CSS file, so "first-view CSS" is all CSS. 150 kB is 1.6× to 2.6× what this stack needs, so it catches nothing; budget against a recorded baseline.
8. **Separate lab from field.** p75 LCP / INP / CLS and web-vitals sampling cannot be verified before launch. Split them from the lab gate, name the CI provider, and reconcile the gate ("exercise portals") with React Doctor's `prefer-html-dialog` warning.
9. **Add a product spec.** The prompt has none; routes, data and the lazy feature had to come from elsewhere.

## Not verified

- `react-doctor scan` (interactive). The static check ran: 1 warning.
- Throttled network or CPU, real devices, Safari, release Firefox. Timings are localhost, one Apple-silicon Mac, headless.
- LCP, INP, CLS, and any field data. Timings are in-page marks.
- CI: no workflow pushed (no provider named; token lacks `workflow` scope).
- A virtualised list, navigation from a small page, and the `staleTime: 0` double fetch.
- The install line below from a fresh clone.

## Run it

Bun 1.4.5 is a devDependency, so no global install is needed.

```bash
npm install --no-package-lock --save-dev --save-exact bun@1.4.5 && ./node_modules/.bin/bun ci
```

Then, with `./node_modules/.bin` on `PATH`:

| Command                                                | Does                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `bun run dev` / `RENDERER=react-dom bun run dev`       | Dev server, either renderer                                  |
| `bun run build:both`                                   | Production builds into `dist-redact` and `dist-react-dom`    |
| `bun run budget`                                       | Byte budgets from the Vite manifests; exits 1 on a breach    |
| `bun run playwright:install`                           | Chromium, Firefox, WebKit into `node_modules`                |
| `bun run test:flows`                                   | Required flows, both renderers, three browsers               |
| `bun run bench && bun run report`                      | Timings into `results/raw`, tables into `results/summary.md` |
| `bun lint`, `bun fmt --check`, `bun check`, `bun test` | The prompt's checks                                          |
| `bun run doctor`                                       | React Doctor static check, offline flags                     |

Layout: `src/` app, `mock/` seeded data and the serve-only API plugin, `scripts/budget.mjs`, `scripts/report.mjs`, `tests/flows.pw.ts`, `tests/bench.pw.ts`, `results/`.
