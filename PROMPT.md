Build a fast client-rendered React app

Use TanStack Redact 0.3.1 as the default browser renderer, with React DOM as the fallback.

Stack
• Vite 8.3.8 (Rolldown), @vitejs/plugin-react 6.3.0, React and React DOM 19.3.1,
  React Compiler 1.0.0 (babel-plugin-react-compiler via @rolldown/plugin-babel 0.3.1),
  TypeScript 7.0.2 (strict is the default).
• TanStack Router 1.170.46 with router-plugin 1.169.0 for file-based routes.
  TanStack Query 5.108.4 for server data. StyleX 0.19.2 via @stylexjs/unplugin 0.19.2
  for extracted CSS.
• Bun 1.4.5 (stable) for development and CI.

Build with Redact
Register Vite plugins in this order:
  1. tanstackRouter({ autoCodeSplitting: true })   from @tanstack/router-plugin/vite
  2. stylex.vite({ runtimeInjection: false })      from @stylexjs/unplugin
  3. react()                                       from @vitejs/plugin-react
  4. babel({ presets: [reactCompilerPreset()] })   from @rolldown/plugin-babel
  5. redact()                                      from @tanstack/redact/vite
Keep standard React imports; the plugin aliases them. Redact has no built-in switch
back to React DOM, so add one: an env var (RENDERER=react-dom) that omits redact()
from the plugin array. Both builds must come from the same commit.

Load on intent
• On entry, start critical queries in the route loader; it runs in parallel with the
  route component download. Share one QueryClient and one queryOptions definition per
  resource. In the loader, await queryClient.query(options) for required fresh data,
  or queryClient.query({ ...options, staleTime: 'static' }) when cached data is
  acceptable. Read it with useSuspenseQuery. Give secondary panels their own Suspense
  boundaries.
• For navigation, set defaultPreload to 'intent' and defaultPreloadStaleTime to 0 so
  Query owns freshness. Leave defaultPreloadDelay at its 50 ms default. Intent
  preloading is documented for hover and touchstart; confirm keyboard focus preloads
  in a test and add a focus handler if it does not. Turn preloading off on low-value
  links with the Link preload prop.
• For editors and charts, call the same import() that React.lazy uses on deliberate
  hover, focus, or press, so the module cache is warm. Open the feature on activation.
  Load rarely used tools on demand. Test direct links and cold taps, and assert in the
  network log that the chunk is fetched once.

Keep the first view small
Fail CI above 150 kB total cold-entry JS, 50 kB route-specific startup JS, or 20 kB
first-view CSS, all Brotli. Enable build.manifest and walk imports, dynamicImports and
css from the entry. The manifest carries no sizes, so the budget script must read each
file and Brotli it. Count each asset once across the shell, matched layouts, route
chunks, and preloads. Cross-check against a cold browser trace. Count the CSS file
StyleX actually emits. Make the LCP image discoverable early and reserve its
dimensions.

Ship on measured results
Run bun ci, bun lint, bun fmt --check, bun check, bun test, and bun run build. Run
React Doctor (0.9.23) static checks on new PR findings. Use Playwright to replay cold
entry, warm navigation, and typing during filtering with realistic data, in Chromium,
Firefox and WebKit.

Profile one slow interaction at a time, locally, with the pinned React Doctor CLI:

    bun run react-doctor scan "$PREVIEW_URL"

scan is interactive: it opens Chrome, records until Enter or five minutes, and prints
the path of a compressed DevTools trace. It is not a CI step. Treat the trace as
sensitive; do not commit or upload it.

Redact renders synchronously: transitions are not interruptible and useDeferredValue
keeps stale results. Its own benchmarks show slower Suspense retry cycles, Safari and
Firefox are unverified upstream, and not every React Compiler output pattern is
validated. Before release, compare both renderers on the same commit. Measure time to
usable content, Suspense navigation time, and input latency while filtering the
largest realistic list. Exercise forms, portals, and Suspense navigation in all three
browsers. Ship Redact when cold entry improves and those interactions hold their
baseline. Ship React DOM if Redact misses either condition or breaks a required flow.

Report before/after timings and bytes for both renderers. Sample
web-vitals/attribution by route template and release to find slow interactions in the
field. Target p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, and fully cached navigation to
visible content ≤ 200 ms.

