// Timing comparison of the two renderer builds (plus an A/A copy of React DOM for the
// noise floor). One test per browser project; targets are interleaved inside every run.
// All timings come from in-page marks that Chromium, Firefox and WebKit all support.
import { mkdirSync, writeFileSync } from 'node:fs'
import { type Browser, type Page, test } from '@playwright/test'
import { DELAY } from '../mock/api-plugin.ts'
import { TARGETS, type TargetName, urlOf } from '../playwright.config'

const RUNS = Number(process.env.RUNS ?? 9)
const TYPING_RUNS = Number(process.env.TYPING_RUNS ?? 5)
const KEYS = ['a', 'n', 'd', 'r', 'e', 'Backspace', 'Backspace', 'Backspace', 'Backspace', 'Backspace']
const ITEM = '1000'
const targets = Object.keys(TARGETS) as TargetName[]

type Marks = { seen: Record<string, number>; painted: Record<string, number>; t0: number }

// Installed before any app code. "seen" = DOM committed; "painted" = first frame after that
// (requestAnimationFrame + a MessageChannel hop, i.e. after style/layout/paint of that frame).
function installMarks() {
  const marks: Marks = ((window as any).__marks = { seen: {}, painted: {}, t0: 0 })
  const selectors: Record<string, string> = {
    row: '[data-testid=row]',
    item: '[data-testid=item-name]',
    fallback: '[data-testid=activity-fallback]',
    activity: '[data-testid=activity]',
  }
  const afterPaint = (callback: () => void) =>
    requestAnimationFrame(() => {
      const channel = new MessageChannel()
      channel.port1.onmessage = callback
      channel.port2.postMessage(0)
    })
  ;(window as any).__afterPaint = afterPaint
  const check = () => {
    for (const [name, selector] of Object.entries(selectors)) {
      if (name in marks.seen || !document.querySelector(selector)) continue
      marks.seen[name] = performance.now()
      afterPaint(() => (marks.painted[name] = performance.now()))
    }
  }
  new MutationObserver(check).observe(document, { childList: true, subtree: true })
  // Restart the clock for an in-page navigation; t0 is the next trusted or synthetic click.
  ;(window as any).__resetOnClick = () => {
    marks.seen = {}
    marks.painted = {}
    window.addEventListener('click', () => (marks.t0 = performance.now()), { capture: true, once: true })
  }
  // Resolves once the committed rows reflect the input's value after the next keystroke.
  ;(window as any).__armKey = () => {
    ;(window as any).__key = new Promise((resolve) => {
      const input = document.querySelector<HTMLInputElement>('[data-testid=filter]')!
      const table = document.querySelector<HTMLElement>('[data-testid=rows]')!
      let t0: number | undefined
      let echo = 0
      let done = false
      const check = () => {
        if (done || t0 === undefined || table.dataset.applied !== input.value) return
        done = true
        observer.disconnect()
        const commit = performance.now() - t0
        afterPaint(() => resolve({ commit, paint: performance.now() - t0!, echo }))
      }
      const observer = new MutationObserver(check)
      observer.observe(table, { attributes: true, attributeFilter: ['data-applied'] })
      window.addEventListener(
        'input',
        () => {
          t0 = performance.now()
          afterPaint(() => (echo ||= performance.now() - t0!))
          queueMicrotask(check)
        },
        { capture: true, once: true },
      )
    })
  }
}

const marks = (page: Page) => page.evaluate(() => (window as any).__marks as Marks)
const painted = (page: Page, name: string) =>
  page.waitForFunction((key) => (window as any).__marks.painted[key] !== undefined, name, { polling: 'raf' })

async function fresh(browser: Browser, target: TargetName, path: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }) // cold HTTP cache
  const page = await context.newPage()
  await page.addInitScript(installMarks)
  await page.goto(urlOf(target) + path, { waitUntil: 'commit' })
  return { context, page }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

test('bench', async ({ browser, browserName }) => {
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

  mkdirSync('results/raw', { recursive: true })
  writeFileSync(
    `results/raw/${browserName}.json`,
    JSON.stringify(
      {
        browser: browserName,
        version: browser.version(),
        runs: RUNS,
        typingRuns: TYPING_RUNS,
        keys: KEYS,
        mockDelayMs: DELAY,
        samples,
      },
      null,
      2,
    ) + '\n',
  )
})
