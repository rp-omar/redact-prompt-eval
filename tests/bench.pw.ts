// Timing comparison of the two renderer builds (plus an A/A copy of React DOM for the
// noise floor). One test per browser project; targets are interleaved inside every run.
// All timings come from in-page marks that Chromium, Firefox and WebKit all support.
import { mkdirSync, writeFileSync } from 'node:fs'
import { type Browser, type Page, test } from '@playwright/test'
import { DELAY } from '../mock/api-plugin.ts'
import { CONDITION, TARGETS, type TargetName, urlOf } from '../playwright.config'
import { installMarks } from '../scripts/marks.mjs'

const RUNS = Number(process.env.RUNS ?? 9)
const TYPING_RUNS = Number(process.env.TYPING_RUNS ?? 5)
const KEYS = ['a', 'n', 'd', 'r', 'e', 'Backspace', 'Backspace', 'Backspace', 'Backspace', 'Backspace']
const ITEM = '1000'
const targets = Object.keys(TARGETS) as TargetName[]

type Marks = { seen: Record<string, number>; painted: Record<string, number>; t0: number }

// Slow profile for THROTTLE=slow4g-cpu4: Lighthouse's "mobile slow 4G" DevTools throttling
// (562.5 ms request latency, 1,474.56 kbps down, 675 kbps up) plus 4x CPU slowdown.
// Applied through CDP, so it exists in Chromium only.
const THROTTLE = process.env.THROTTLE === 'slow4g-cpu4'
const SLOW = { latencyMs: 562.5, downKbps: 1474.56, upKbps: 675, cpuRate: 4 }
// Every condition writes to its own directory, so run 1 (results/raw/*.json) is never overwritten.
const LABEL = process.env.BENCH_LABEL ?? 'unlabelled'

const marks = (page: Page) => page.evaluate(() => (window as any).__marks as Marks)
const painted = (page: Page, name: string) =>
  page.waitForFunction((key) => (window as any).__marks.painted[key] !== undefined, name, { polling: 'raf' })

async function fresh(browser: Browser, target: TargetName, path: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }) // cold HTTP cache
  const page = await context.newPage()
  await page.addInitScript(installMarks)
  if (THROTTLE) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: SLOW.latencyMs,
      downloadThroughput: (SLOW.downKbps * 1024) / 8,
      uploadThroughput: (SLOW.upKbps * 1024) / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW.cpuRate })
  }
  await page.goto(urlOf(target) + path, { waitUntil: 'commit' })
  return { context, page }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

test('bench', async ({ browser, browserName }) => {
  test.skip(THROTTLE && browserName !== 'chromium', 'CDP throttling is Chromium-only')
  const samples: Record<string, Record<string, number[]>> = {}
  const push = (target: string, metric: string, value: number) => ((samples[target] ??= {})[metric] ??= []).push(value)
  const rotated = (run: number) => targets.map((_, index) => targets[(index + run) % targets.length]!)

  // Warm-up: one untimed load per target so server-side file caches and JITs are primed.
  for (const target of targets) {
    const { context, page } = await fresh(browser, target, '/')
    await painted(page, 'row')
    await context.close()
  }

  for (let run = 0; run < RUNS; run++) {
    for (const target of rotated(run)) {
      // 1. Cold entry, list: navigation start -> 5,000 rows committed and painted.
      {
        const { context, page } = await fresh(browser, target, '/')
        await painted(page, 'row')
        const m = await marks(page)
        push(target, 'coldList', m.painted.row!)
        push(target, 'coldListCommit', m.seen.row!)
        await context.close()
      }
      // 2. Cold entry, detail (direct link).
      {
        const { context, page } = await fresh(browser, target, `/items/${ITEM}`)
        await painted(page, 'activity')
        const m = await marks(page)
        push(target, 'coldDetail', m.painted.item!)
        push(target, 'coldDetailPanel', m.painted.activity!)
        await context.close()
      }
      // 3. Suspense navigation: list -> detail with nothing preloaded (synthetic click, no hover).
      {
        const { context, page } = await fresh(browser, target, '/')
        await painted(page, 'row')
        await page.waitForTimeout(250)
        await page.evaluate(() => {
          ;(window as any).__resetOnClick()
          document.querySelector<HTMLElement>('[data-testid=row] a')!.click()
        })
        await painted(page, 'activity')
        const m = await marks(page)
        const responseEnd = await page.evaluate(
          () =>
            (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).find((entry) =>
              entry.name.endsWith('/activity'),
            )!.responseEnd,
        )
        push(target, 'suspRequired', m.painted.item! - m.t0)
        push(target, 'suspPanel', m.painted.activity! - m.t0)
        push(target, 'suspFallbackShown', m.seen.fallback === undefined ? 0 : 1)
        push(target, 'suspPanelAfterData', m.seen.activity! - responseEnd)
        await context.close()
      }
      // 4. Warm navigation: hover preloads chunk + data, then a real click.
      {
        const { context, page } = await fresh(browser, target, '/')
        await painted(page, 'row')
        const link = page.locator('[data-testid=row] a').first()
        await link.hover()
        await page.waitForFunction(() => {
          const names = performance.getEntriesByType('resource').map((entry) => entry.name)
          return ['/activity', '/api/items/1000', 'items._id'].every((part) =>
            names.some((name) => name.includes(part)),
          )
        })
        await page.waitForTimeout(250)
        await page.evaluate(() => (window as any).__resetOnClick())
        await page.mouse.down()
        await page.mouse.up()
        await painted(page, 'activity')
        const m = await marks(page)
        push(target, 'warmNav', m.painted.item! - m.t0)
        push(target, 'warmNavPanel', m.painted.activity! - m.t0)
        await context.close()
      }
    }
  }

  // 6. Navigation to the same detail page from a small page (/about) instead of the 5,000-row
  //    list, started from script (About has no link to an item). Cold = nothing preloaded;
  //    warm = route chunk and data preloaded first. Compare with suspRequired and warmNav.
  for (let run = 0; run < RUNS; run++) {
    for (const target of rotated(run)) {
      for (const warm of [false, true]) {
        const { context, page } = await fresh(browser, target, '/about')
        await page.waitForLoadState('load')
        await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'About')
        if (warm) {
          await page.evaluate(
            (id) => (window as any).__TSR_ROUTER__.preloadRoute({ to: '/items/$id', params: { id } }),
            ITEM,
          )
        }
        await page.waitForTimeout(250)
        await page.evaluate((id) => {
          ;(window as any).__resetNow()
          void (window as any).__TSR_ROUTER__.navigate({ to: '/items/$id', params: { id } })
        }, ITEM)
        await painted(page, 'activity')
        const m = await marks(page)
        push(target, warm ? 'smallWarmNav' : 'smallNavRequired', m.painted.item! - m.t0)
        push(target, warm ? 'smallWarmNavPanel' : 'smallNavPanel', m.painted.activity! - m.t0)
        await context.close()
      }
    }
  }

  // 5. Input latency while filtering 5,000 unvirtualised rows; plain state and useDeferredValue.
  for (let run = 0; run < TYPING_RUNS; run++) {
    for (const target of rotated(run)) {
      for (const [mode, path] of [
        ['type', '/'],
        ['typeDeferred', '/?deferred=true'],
      ] as const) {
        const { context, page } = await fresh(browser, target, path)
        await painted(page, 'row')
        await page.waitForTimeout(250)
        await page.locator('[data-testid=filter]').focus()
        const strokes: { commit: number; paint: number; echo: number }[] = []
        for (const key of KEYS) {
          await page.evaluate(() => (window as any).__armKey())
          await page.keyboard.press(key)
          strokes.push(await page.evaluate(() => (window as any).__key))
          await page.waitForTimeout(60)
        }
        push(target, `${mode}Paint`, median(strokes.map((stroke) => stroke.paint)))
        push(target, `${mode}Commit`, median(strokes.map((stroke) => stroke.commit)))
        push(target, `${mode}Echo`, median(strokes.map((stroke) => stroke.echo)))
        push(target, `${mode}WorstPaint`, Math.max(...strokes.map((stroke) => stroke.paint)))
        push(target, `${mode}WorstEcho`, Math.max(...strokes.map((stroke) => stroke.echo)))
        await context.close()
      }
    }
  }

  mkdirSync(`results/raw/${LABEL}`, { recursive: true })
  writeFileSync(
    `results/raw/${LABEL}/${browserName}.json`,
    JSON.stringify(
      {
        browser: browserName,
        version: browser.version(),
        runs: RUNS,
        typingRuns: TYPING_RUNS,
        keys: KEYS,
        mockDelayMs: DELAY,
        condition: { ...CONDITION, throttle: THROTTLE ? SLOW : null },
        samples,
      },
      null,
      2,
    ) + '\n',
  )
})
