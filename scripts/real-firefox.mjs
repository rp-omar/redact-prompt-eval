// Run-2 check (FINDINGS.md V-5): the gate metrics in the installed release Firefox, driven
// over WebDriver (geckodriver). Playwright cannot drive a stock Firefox; it ships its own build.
// WebDriver has no init-script hook, so the timing marks are injected into index.html by
// scripts/serve.mjs --inject-marks. Bundles are the same files the other conditions serve.
//   node scripts/real-firefox.mjs        (builds must exist: bun run build:both)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { download } from 'geckodriver'
import { Builder, By, Key } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox.js'

const RUNS = Number(process.env.RUNS ?? 9)
const TYPING_RUNS = Number(process.env.TYPING_RUNS ?? 5)
const KEYS = ['a', 'n', 'd', 'r', 'e', Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE]
const TARGETS = {
  redact: { port: 4461, dist: 'dist-redact' },
  'react-dom': { port: 4462, dist: 'dist-react-dom' },
  'react-dom-b': { port: 4463, dist: 'dist-react-dom' },
}
const names = Object.keys(TARGETS)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The driver binary is kept inside node_modules, not in a user-level cache.
const driverPath = await download(undefined, 'node_modules/.cache/geckodriver')
const servers = Object.values(TARGETS).map(({ port, dist }) =>
  spawn('node', ['scripts/serve.mjs', '--dir', dist, '--port', String(port), '--inject-marks'], { stdio: 'ignore' }),
)
await sleep(1500)

// One WebDriver session per measurement: a fresh temporary profile, so the HTTP cache is cold.
async function withPage(target, path, body) {
  const options = new firefox.Options().addArguments('-headless').windowSize({ width: 1280, height: 800 })
  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(new firefox.ServiceBuilder(driverPath))
    .build()
  try {
    await driver.get(`http://localhost:${TARGETS[target].port}${path}`)
    return await body(driver)
  } finally {
    await driver.quit()
  }
}
const painted = (driver, name) =>
  driver.wait(() => driver.executeScript((key) => window.__marks.painted[key] !== undefined, name), 30_000)
const marks = (driver) => driver.executeScript(() => window.__marks)
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const samples = {}
const push = (target, metric, value) => ((samples[target] ??= {})[metric] ??= []).push(value)
const rotated = (run) => names.map((_, index) => names[(index + run) % names.length])
let version = ''

try {
  for (const target of names)
    await withPage(target, '/', async (driver) => {
      await painted(driver, 'row')
      version = (await driver.getCapabilities()).get('browserVersion')
    })

  for (let run = 0; run < RUNS; run++) {
    for (const target of rotated(run)) {
      await withPage(target, '/', async (driver) => {
        await painted(driver, 'row')
        const m = await marks(driver)
        push(target, 'coldList', m.painted.row)
        push(target, 'coldListCommit', m.seen.row)
      })
      await withPage(target, '/', async (driver) => {
        await painted(driver, 'row')
        await sleep(250)
        await driver.executeScript(() => {
          window.__resetOnClick()
          document.querySelector('[data-testid=row] a').click()
        })
        await painted(driver, 'activity')
        const m = await marks(driver)
        push(target, 'suspRequired', m.painted.item - m.t0)
        push(target, 'suspPanel', m.painted.activity - m.t0)
      })
    }
  }

  for (let run = 0; run < TYPING_RUNS; run++) {
    for (const target of rotated(run)) {
      await withPage(target, '/', async (driver) => {
        await painted(driver, 'row')
        await sleep(250)
        const input = await driver.findElement(By.css('[data-testid=filter]'))
        await input.click()
        const strokes = []
        for (const key of KEYS) {
          await driver.executeScript(() => window.__armKey())
          await input.sendKeys(key)
          await driver.wait(() => driver.executeScript(() => window.__keyResult !== undefined), 30_000)
          strokes.push(await driver.executeScript(() => window.__keyResult))
          await sleep(60)
        }
        push(target, 'typePaint', median(strokes.map((stroke) => stroke.paint)))
        push(target, 'typeCommit', median(strokes.map((stroke) => stroke.commit)))
        push(target, 'typeWorstPaint', Math.max(...strokes.map((stroke) => stroke.paint)))
      })
    }
  }

  mkdirSync('results/raw/real-browsers', { recursive: true })
  writeFileSync(
    'results/raw/real-browsers/firefox-release.json',
    JSON.stringify(
      {
        browser: 'firefox-release',
        version,
        runs: RUNS,
        typingRuns: TYPING_RUNS,
        keys: KEYS.map((key) => (key === Key.BACK_SPACE ? 'Backspace' : key)),
        mockDelayMs: { list: 30, item: 40, activity: 150, save: 40 },
        condition: { variant: 'default', serve: 'brotli', throttle: null, driver: 'geckodriver (WebDriver), headless' },
        samples,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`firefox ${version}: wrote results/raw/real-browsers/firefox-release.json`)
} finally {
  for (const server of servers) server.kill()
}
