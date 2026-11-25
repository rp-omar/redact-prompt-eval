// Run-2 verification checks that are counts or lab vitals rather than the timing benchmark:
//   1. request counts for "hover (intent preload) then click", to measure the staleTime: 0
//      double fetch (run with VARIANT=stale0 and again without);
//   2. LCP / INP / CLS / FCP from web-vitals/attribution, injected as an init script so the
//      bundles under test are not changed.
// Results go to results/raw/verify/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { type Browser, type Page, test } from '@playwright/test'
import { CONDITION, urlOf } from '../playwright.config'

const RENDERERS = ['redact', 'react-dom'] as const
const ITEM = '1000'
const RUNS = Number(process.env.RUNS ?? 5)
const THROTTLE = process.env.THROTTLE === 'slow4g-cpu4'
const TAG = `${CONDITION.variant}-${CONDITION.serve}${THROTTLE ? '-slow4g-cpu4' : ''}`
const WEB_VITALS = readFileSync('node_modules/web-vitals/dist/web-vitals.attribution.iife.js', 'utf8')

const save = (name: string, data: unknown) => {
  mkdirSync('results/raw/verify', { recursive: true })
  writeFileSync(`results/raw/verify/${name}.json`, JSON.stringify(data, null, 2) + '\n')
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

async function open(browser: Browser, url: string, init?: (page: Page) => Promise<unknown>) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()
  await init?.(page)
  if (THROTTLE) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 562.5,
      downloadThroughput: (1474.56 * 1024) / 8,
      uploadThroughput: (675 * 1024) / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  const requests: string[] = []
  page.on('request', (request) => requests.push(new URL(request.url()).pathname))
  await page.goto(url)
  return { context, page, requests }
}

test('request counts: intent preload then click', async ({ browser, browserName }) => {
  test.skip(THROTTLE, 'counts do not depend on throttling')
  const out: Record<string, Record<string, number>> = {}
  for (const renderer of RENDERERS) {
    const { context, page, requests } = await open(browser, urlOf(renderer))
    const count = (pattern: RegExp) => requests.filter((url) => pattern.test(url)).length
    const link = page.getByTestId('row').first().getByRole('link')
    await link.hover()
    // The intent preload has finished once the chunk and both API responses are in.
    await page.waitForFunction(() => {
      const names = performance.getEntriesByType('resource').map((entry) => entry.name)
      return ['/activity', '/api/items/1000', 'items._id'].every((part) => names.some((name) => name.includes(part)))
    })
    await page.waitForTimeout(500)
    const afterPreload = {
      item: count(/^\/api\/items\/1000$/),
      activity: count(/\/activity$/),
    }
    await link.click()
    await page.getByTestId('activity').waitFor()
    await page.waitForTimeout(700)
    const afterClick = {
      item: count(/^\/api\/items\/1000$/),
      activity: count(/\/activity$/),
    }
    await page.getByRole('link', { name: '← Directory' }).click()
    await page.getByTestId('row').first().waitFor()
    await page.waitForTimeout(700)
    out[renderer] = {
      itemAfterPreload: afterPreload.item,
      activityAfterPreload: afterPreload.activity,
      itemAfterClick: afterClick.item,
      activityAfterClick: afterClick.activity,
      listAfterReturn: count(/^\/api\/items$/),
      routeChunk: count(/assets\/items\._id-/),
    }
    await context.close()
  }
  save(`requests-${TAG}-${browserName}`, {
    condition: CONDITION,
    browser: browser.version(),
    counts: out,
  })
})

type Vital = { value: number; detail: Record<string, unknown> }

// Registers every web-vitals/attribution callback with reportAllChanges, keeping the latest value.
const REGISTER = `
;(() => {
  const store = (window.__vitals = {})
  const pick = (name, attribution) => {
    if (name === 'LCP') return { target: attribution.target, timeToFirstByte: attribution.timeToFirstByte, resourceLoadDelay: attribution.resourceLoadDelay, resourceLoadDuration: attribution.resourceLoadDuration, elementRenderDelay: attribution.elementRenderDelay }
    if (name === 'INP') return { target: attribution.interactionTarget, type: attribution.interactionType, inputDelay: attribution.inputDelay, processingDuration: attribution.processingDuration, presentationDelay: attribution.presentationDelay }
    if (name === 'CLS') return { target: attribution.largestShiftTarget, largestShiftValue: attribution.largestShiftValue }
    return {}
  }
  for (const name of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'])
    webVitals['on' + name]((metric) => (store[name] = { value: metric.value, detail: pick(name, metric.attribution ?? {}) }), { reportAllChanges: true })
})()`

const withVitals = (page: Page) => page.addInitScript({ content: WEB_VITALS + REGISTER })
// web-vitals finalises LCP, CLS and INP when the page is hidden; emulate that, then read.
const readVitals = async (page: Page) => {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(100)
  return page.evaluate(() => (window as any).__vitals as Record<string, Vital>)
}

test('web vitals in the lab', async ({ browser, browserName }) => {
  test.skip(THROTTLE && browserName !== 'chromium', 'CDP throttling is Chromium-only')
  const samples: Record<string, Record<string, number[]>> = {}
  const details: Record<string, Record<string, unknown>> = {}
  const record = (renderer: string, scenario: string, vitals: Record<string, Vital>) => {
    for (const [name, vital] of Object.entries(vitals)) {
      ;((samples[renderer] ??= {})[`${scenario}.${name}`] ??= []).push(vital.value)
      ;(details[renderer] ??= {})[`${scenario}.${name}`] = vital.detail
    }
  }
  for (let run = 0; run < RUNS; run++) {
    for (const renderer of run % 2 ? [...RENDERERS].reverse() : RENDERERS) {
      // List: load, then type five characters into the filter (INP = typing).
      {
        const { context, page } = await open(browser, urlOf(renderer), withVitals)
        await page.getByTestId('row').first().waitFor()
        await page.waitForTimeout(600)
        await page.getByTestId('filter').click()
        for (const key of ['a', 'n', 'd', 'r', 'e']) {
          await page.keyboard.press(key)
          await page.waitForTimeout(THROTTLE ? 1200 : 400)
        }
        record(renderer, 'list', await readVitals(page))
        await context.close()
      }
      // Detail, direct link: required content, then the Suspense panel reveal (CLS).
      {
        const { context, page } = await open(browser, `${urlOf(renderer)}/items/${ITEM}`, withVitals)
        await page.getByTestId('activity').waitFor()
        await page.waitForTimeout(600)
        record(renderer, 'detail', await readVitals(page))
        await context.close()
      }
      // List -> detail by a real click (INP = the navigation click; CLS spans both views).
      {
        const { context, page } = await open(browser, urlOf(renderer), withVitals)
        const link = page.getByTestId('row').first().getByRole('link')
        await link.waitFor()
        await page.waitForTimeout(600)
        await link.click()
        await page.getByTestId('activity').waitFor()
        await page.waitForTimeout(THROTTLE ? 1500 : 600)
        record(renderer, 'nav', await readVitals(page))
        await context.close()
      }
    }
  }
  const medians = Object.fromEntries(
    Object.entries(samples).map(([renderer, metrics]) => [
      renderer,
      Object.fromEntries(
        Object.entries(metrics).map(([name, values]) => [
          name,
          {
            median: median(values),
            min: Math.min(...values),
            max: Math.max(...values),
            n: values.length,
          },
        ]),
      ),
    ]),
  )
  save(`vitals-${TAG}-${browserName}`, {
    condition: { ...CONDITION, throttle: THROTTLE },
    browser: `${browserName} ${browser.version()}`,
    runs: RUNS,
    medians,
    lastAttribution: details,
    samples,
  })
})
