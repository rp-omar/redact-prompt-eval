// Turns results/raw/<browser>.json + results/budget.json into results/summary.md and
// results/summary.json, and applies the ship rule recorded in FINDINGS.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// node scripts/report.mjs            -> run 1 (results/raw/*.json, results/summary.md)
// node scripts/report.mjs <label>    -> results/raw/<label>/*.json, results/summary-<label>.md
// VARIANT picks the matching budget file (results/budget-<variant>.json).
const LABEL = process.argv[2]
const RAW = LABEL ? `results/raw/${LABEL}` : 'results/raw'
const OUT = LABEL ? `results/summary-${LABEL}` : 'results/summary'
const BUDGET = `results/budget${process.env.VARIANT ? `-${process.env.VARIANT}` : ''}.json`
const BROWSERS = ['chromium', 'firefox', 'webkit', 'chrome', 'firefox-release']
const MIN_TOLERANCE = 0.05

// [key, label, role in the gate]
const METRICS = [
  ['coldList', 'Cold entry → usable content (list, 5,000 rows painted)', 'improve'],
  ['warmNav', 'Warm navigation → visible content (preloaded, click → painted)', 'info'],
  ['suspRequired', 'Suspense navigation (cold click → required content painted)', 'hold'],
  ['typePaint', 'Input latency, filter over 5,000 rows (keystroke → rows painted, median key)', 'hold'],
]
const EXTRA = [
  ['coldListCommit', 'Cold entry, list: rows committed to DOM'],
  ['coldDetail', 'Cold entry, detail: required content painted'],
  ['coldDetailPanel', 'Cold entry, detail: secondary panel painted'],
  ['suspPanel', 'Suspense navigation: secondary panel painted'],
  ['suspPanelAfterData', 'Secondary panel: data received → committed'],
  ['warmNavPanel', 'Warm navigation: secondary panel painted'],
  ['typeCommit', 'Typing: keystroke → rows committed (median key)'],
  ['typeWorstPaint', 'Typing: slowest keystroke → painted'],
  ['typeDeferredPaint', 'Typing, useDeferredValue: keystroke → rows painted (median key)'],
  ['typeDeferredEcho', 'Typing, useDeferredValue: keystroke → next frame (median key)'],
  ['typeDeferredWorstEcho', 'Typing, useDeferredValue: slowest keystroke → next frame'],
  ['smallNavRequired', 'Navigation from a small page (/about), cold: required content painted'],
  ['smallNavPanel', 'Navigation from a small page (/about), cold: secondary panel painted'],
  ['smallWarmNav', 'Navigation from a small page (/about), preloaded: required content painted'],
]

const sorted = (values) => [...values].sort((a, b) => a - b)
const median = (values) => {
  const s = sorted(values)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
const stat = (values) => ({
  median: median(values),
  min: Math.min(...values),
  max: Math.max(...values),
  n: values.length,
})
const ms = (value) => (value < 10 ? value.toFixed(1) : String(Math.round(value)))
const cell = (s) => `${ms(s.median)} (${ms(s.min)}–${ms(s.max)})`
const pct = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(0)}%`

const raw = Object.fromEntries(
  BROWSERS.filter((browser) => existsSync(`${RAW}/${browser}.json`)).map((browser) => [
    browser,
    JSON.parse(readFileSync(`${RAW}/${browser}.json`, 'utf8')),
  ]),
)
const budget = JSON.parse(readFileSync(BUDGET, 'utf8'))

const summary = { budget: {}, timings: {}, gate: {} }
const lines = []

lines.push('| Measure | Redact | React DOM | Redact vs React DOM |', '|---|---:|---:|---:|')
for (const [key, label, limit] of [
  ['coldEntryJs', 'Cold-entry JS, Brotli', budget.limits.coldEntryJs],
  ['routeJs', 'Route-specific startup JS, Brotli', budget.limits.routeJs],
  ['firstViewCss', 'First-view CSS, Brotli', budget.limits.firstViewCss],
]) {
  for (const template of Object.keys(budget.builds.redact.routes)) {
    const redact = budget.builds.redact.routes[template][key].bytes
    const reactDom = budget.builds['react-dom'].routes[template][key].bytes
    summary.budget[`${key} ${template}`] = { redact, reactDom, limit }
    const mark = (bytes) => `${(bytes / 1000).toFixed(1)} kB ${bytes <= limit ? '✓' : '✗'}`
    lines.push(
      `| ${label}, \`${template}\` (budget ${limit / 1000} kB) | ${mark(redact)} | ${mark(reactDom)} | ${reactDom ? pct(redact / reactDom - 1) : '–'} |`,
    )
  }
}

const gateRows = []
for (const [key, label, role] of METRICS) {
  for (const browser of Object.keys(raw)) {
    const samples = raw[browser].samples
    // The WebDriver run (release Firefox) does not record every scenario.
    if (!samples.redact[key]) continue
    const redact = stat(samples.redact[key])
    const reactDom = stat(samples['react-dom'][key])
    const control = stat(samples['react-dom-b'][key])
    const noise = Math.abs(control.median / reactDom.median - 1)
    const tolerance = Math.max(noise, MIN_TOLERANCE)
    const delta = redact.median / reactDom.median - 1
    const pass = role === 'improve' ? delta < -tolerance : role === 'hold' ? delta <= tolerance : null
    summary.timings[`${key} ${browser}`] = { redact, reactDom, control, noise, tolerance, delta, role, pass }
    if (pass !== null) gateRows.push({ key, browser, role, delta, tolerance, pass })
    lines.push(
      `| ${label}, ${browser}, ms | ${cell(redact)} | ${cell(reactDom)} | ${pct(delta)} (A/A noise ${pct(noise).slice(1)}) |`,
    )
  }
}

const extra = ['| Extra measure, ms: median (min–max) | Browser | Redact | React DOM | Δ |', '|---|---|---:|---:|---:|']
for (const [key, label] of EXTRA) {
  for (const browser of Object.keys(raw)) {
    const samples = raw[browser].samples
    if (!samples.redact[key]) continue
    const redact = stat(samples.redact[key])
    const reactDom = stat(samples['react-dom'][key])
    summary.timings[`${key} ${browser}`] = { redact, reactDom, delta: redact.median / reactDom.median - 1 }
    extra.push(
      `| ${label} | ${browser} | ${cell(redact)} | ${cell(reactDom)} | ${pct(redact.median / reactDom.median - 1)} |`,
    )
  }
}

const coldImproves = gateRows.filter((row) => row.role === 'improve').every((row) => row.pass)
const interactionsHold = gateRows.filter((row) => row.role === 'hold').every((row) => row.pass)
summary.gate = {
  coldImproves,
  interactionsHold,
  failing: gateRows
    .filter((row) => !row.pass)
    .map((row) => `${row.key}/${row.browser} ${pct(row.delta)} (tolerance ${pct(row.tolerance).slice(1)})`),
  shipRedact: coldImproves && interactionsHold,
}
const meta = Object.values(raw)
  .map((r) => `${r.browser} ${r.version}`)
  .join(', ')
const first = Object.values(raw)[0]
const out = [
  lines.join('\n'),
  '',
  `Timings: median (min–max) in ms over ${first?.runs} runs per renderer per browser (${first?.typingRuns} typing runs × ${first?.keys.length} keystrokes), ` +
    `production builds under ${first?.condition?.serve === 'brotli' ? '`scripts/serve.mjs` (Brotli)' : '`vite preview`'} on localhost, renderers interleaved. Browsers: ${meta}. ` +
    `Mock API delays: ${JSON.stringify(first?.mockDelayMs)} ms.` +
    (first?.condition ? ` Condition: ${JSON.stringify(first.condition)}.` : ''),
  '',
  extra.join('\n'),
  '',
  `Gate: cold entry improves = ${coldImproves}; interactions hold = ${interactionsHold}; ship Redact = ${summary.gate.shipRedact}.`,
  summary.gate.failing.length ? `Failing: ${summary.gate.failing.join('; ')}.` : '',
].join('\n')

writeFileSync(`${OUT}.md`, out + '\n')
writeFileSync(`${OUT}.json`, JSON.stringify(summary, null, 2) + '\n')
console.log(out)
