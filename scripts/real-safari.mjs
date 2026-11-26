// The gate metrics in the installed Safari, driven over WebDriver (safaridriver). A port of
// scripts/real-firefox.mjs. Needs Safari → Settings → Developer → "Allow remote automation".
// Differences from the Firefox run: Safari has no headless mode (a window opens), and
// safaridriver takes no profile option, so a cold HTTP cache is forced by serving every
// measurement from a port never used before (the cache is keyed by origin).
//   node scripts/real-safari.mjs         (builds must exist: bun run build:both)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Builder, By, Key } from 'selenium-webdriver'

const RUNS = Number(process.env.RUNS ?? 9)
const TYPING_RUNS = Number(process.env.TYPING_RUNS ?? 5)
const KEYS = ['a', 'n', 'd', 'r', 'e', Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE]
const TARGETS = { redact: 'dist-redact', 'react-dom': 'dist-react-dom', 'react-dom-b': 'dist-react-dom' }
const names = Object.keys(TARGETS)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let nextPort = 4500

// One server and one WebDriver session per measurement. safaridriver allows one session at a time.
async function withPage(target, path, body) {
  const port = nextPort++
  const server = spawn(
    'node',
    ['scripts/serve.mjs', '--dir', TARGETS[target], '--port', String(port), '--inject-marks'],
    { stdio: 'ignore' },
  )
  const origin = `http://localhost:${port}`
  let driver
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await fetch(origin)
        break
      } catch (error) {
        if (attempt > 100) throw error
        await sleep(50)
      }
    }
    driver = await new Builder().forBrowser('safari').build()
    await driver.manage().window().setRect({ width: 1280, height: 800 })
    await driver.get(origin + path)
    return await body(driver)
  } finally {
    await driver?.quit()
    server.kill()
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

{
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
    'results/raw/real-browsers/safari-release.json',
    JSON.stringify(
      {
        browser: 'safari-release',
        version,
        runs: RUNS,
        typingRuns: TYPING_RUNS,
        keys: KEYS.map((key) => (key === Key.BACK_SPACE ? 'Backspace' : key)),
        mockDelayMs: { list: 30, item: 40, activity: 150, save: 40 },
        condition: {
          variant: 'default',
          serve: 'brotli',
          throttle: null,
          driver: 'safaridriver (WebDriver), headed, fresh origin per measurement',
        },
        samples,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`safari ${version}: wrote results/raw/real-browsers/safari-release.json`)
}
