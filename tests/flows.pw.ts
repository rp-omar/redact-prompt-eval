// Required flows from PROMPT.md, run against both renderer builds in every browser:
// forms, portals, Suspense navigation, intent/focus preloading, and "lazy chunk fetched once".
import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import { type TargetName, urlOf } from '../playwright.config'
import { BUILDS, analyze } from '../scripts/budget.mjs'

const RENDERERS = ['redact', 'react-dom'] as const satisfies readonly TargetName[]
const ITEM = '1000'

function trackRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (request) => urls.push(new URL(request.url()).pathname))
  return {
    urls,
    count: (pattern: RegExp) => urls.filter((url) => pattern.test(url)).length,
  }
}

for (const renderer of RENDERERS) {
  const base = urlOf(renderer)

  test.describe(renderer, () => {
    test('bundle really contains the renderer it claims', async ({ page }) => {
      const dist = BUILDS[renderer]
      const js = Object.keys(analyze(dist).files)
        .filter((file) => file.endsWith('.js'))
        .map((file) => readFileSync(`${dist}/${file}`, 'utf8'))
        .join('\n')
      // "__reactFiber$" is the expando key React DOM stamps on host nodes.
      expect(js.includes('__reactFiber$')).toBe(renderer === 'react-dom')
      await page.goto(base)
      await expect(page.locator('html')).toHaveAttribute('data-renderer', renderer)
      await expect(page.getByTestId('row').first()).toBeVisible()
      const fiberKeys = await page.evaluate(
        () => Object.keys(document.querySelector('[data-testid=row]')!).filter((key) => key.startsWith('__reactFiber$')).length,
      )
      expect(fiberKeys > 0).toBe(renderer === 'react-dom')
    })

    test('cold network log matches the budget script file set', async ({ page }) => {
      const expected = analyze(BUILDS[renderer]).routes
      for (const [template, path] of [['/', '/'], ['/items/$id', `/items/${ITEM}`]] as const) {
        const requests = trackRequests(page)
        await page.goto(base + path)
        await expect(page.getByTestId(template === '/' ? 'row' : 'activity').first()).toBeVisible()
        const assets = (ext: string) => [...new Set(requests.urls.filter((url) => url.endsWith(ext)).map((url) => url.slice(1)))].sort()
        expect(assets('.js'), `${template} JS`).toEqual(expected[template].coldEntryJs.files)
        expect(assets('.css'), `${template} CSS`).toEqual(expected[template].firstViewCss.files)
        await page.goto('about:blank')
      }
    })

    test('list renders 5,000 rows and filters as you type', async ({ page }) => {
      await page.goto(base)
      await expect(page.getByTestId('row')).toHaveCount(5000)
      await page.getByTestId('filter').fill('kestrel bank')
      await expect(page.getByTestId('rows')).toHaveAttribute('data-applied', 'kestrel bank')
      const count = await page.getByTestId('row').count()
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(5000)
      await expect(page.getByTestId('row').first()).toContainText('Kestrel Bank')
      await page.getByTestId('filter').fill('')
      await expect(page.getByTestId('row')).toHaveCount(5000)
    })

    test('useDeferredValue variant still converges on the typed filter', async ({ page }) => {
      await page.goto(`${base}/?deferred=true`)
      await expect(page.getByTestId('row')).toHaveCount(5000)
      await page.getByTestId('filter').pressSequentially('sweden')
      await expect(page.getByTestId('rows')).toHaveAttribute('data-applied', 'sweden')
      await expect(page.getByTestId('row').first()).toContainText('Sweden')
    })

    test('hover preloads the detail route; preload={false} link does not', async ({ page }) => {
      const requests = trackRequests(page)
      await page.goto(base)
      await expect(page.getByTestId('row').first()).toBeVisible()
      await page.getByRole('link', { name: 'About' }).hover()
      await page.waitForTimeout(400)
      expect(requests.count(/assets\/about-/)).toBe(0)
      await page.getByTestId('row').first().getByRole('link').hover()
      await expect.poll(() => requests.count(new RegExp(`^/api/items/${ITEM}$`))).toBe(1)
      await expect.poll(() => requests.count(/assets\/items\._id-/)).toBe(1)
      expect(page.url()).toBe(`${base}/`)
    })

    test('keyboard focus preloads the detail route', async ({ page, browserName }) => {
      const requests = trackRequests(page)
      await page.goto(base)
      await expect(page.getByTestId('row').first()).toBeVisible()
      await page.getByTestId('filter').focus()
      // Safari only tabs to links with Option held (macOS default).
      await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
      await expect(page.getByTestId('row').first().getByRole('link')).toBeFocused()
      await expect.poll(() => requests.count(new RegExp(`^/api/items/${ITEM}$`))).toBe(1)
      expect(page.url()).toBe(`${base}/`)
    })

    test('Suspense navigation: required data first, secondary panel behind its own fallback', async ({ page }) => {
      const requests = trackRequests(page)
      // The fallback can be on screen for only a few ms, so record first-seen times in the page.
      await page.addInitScript(() => {
        const seen: Record<string, number> = ((window as any).__seen = {})
        const check = () => {
          for (const id of ['item-name', 'activity-fallback', 'activity'])
            if (!(id in seen) && document.querySelector(`[data-testid=${id}]`)) seen[id] = performance.now()
        }
        new MutationObserver(check).observe(document, { childList: true, subtree: true })
      })
      await page.goto(base)
      const link = page.getByTestId('row').first().getByRole('link')
      await expect(link).toBeVisible()
      await link.evaluate((element: HTMLElement) => element.click()) // no hover, so no preload
      await expect(page.getByTestId('activity').locator('li')).toHaveCount(20)
      await expect(page.getByTestId('activity-fallback')).toHaveCount(0)
      const seen = await page.evaluate(() => (window as any).__seen as Record<string, number>)
      expect(seen['activity-fallback'], 'secondary panel showed its own fallback').toBeDefined()
      expect(seen['item-name']!).toBeLessThanOrEqual(seen['activity-fallback']!)
      expect(seen['activity-fallback']!).toBeLessThan(seen['activity']!)
      expect(requests.count(new RegExp(`^/api/items/${ITEM}$`))).toBe(1)
      expect(requests.count(new RegExp(`^/api/items/${ITEM}/activity$`))).toBe(1)
      await page.getByRole('link', { name: '← Directory' }).click()
      await expect(page.getByTestId('row')).toHaveCount(5000)
      expect(requests.count(/^\/api\/items$/)).toBe(1) // staleTime: 'static' reuses the cached list
    })

    test('editor: warmed on hover/focus/press, fetched once, form in a portal saves', async ({ page }) => {
      const requests = trackRequests(page)
      await page.goto(`${base}/items/${ITEM}`)
      const edit = page.getByTestId('edit')
      await expect(edit).toBeVisible()
      expect(requests.count(/assets\/ItemEditor-/)).toBe(0)
      await edit.hover()
      await expect.poll(() => requests.count(/assets\/ItemEditor-/)).toBe(1)
      await edit.focus()
      await edit.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      // Portal: the dialog is mounted under <body>, outside the app root.
      expect(await dialog.evaluate((element) => element.closest('#root') === null)).toBe(true)
      const name = dialog.getByLabel('Name')
      await expect(name).toBeFocused()
      await name.fill('Renamed Person')
      await dialog.getByLabel('Status').selectOption('archived')
      await dialog.getByLabel('Notes').fill('edited in test')
      await dialog.getByRole('button', { name: 'Save' }).click()
      await expect(dialog).toHaveCount(0)
      await expect(page.getByTestId('item-name')).toHaveText('Renamed Person')
      await expect(page.getByTestId('item-status')).toHaveText('archived')
      // Re-open and cancel: still a single fetch of the lazy chunk.
      await edit.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(requests.count(/assets\/ItemEditor-/)).toBe(1)
    })

    test('editor: direct link and cold tap each fetch the chunk once', async ({ page }) => {
      const direct = trackRequests(page)
      await page.goto(`${base}/items/${ITEM}?edit=true`)
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(direct.count(/assets\/ItemEditor-/)).toBe(1)

      await page.goto('about:blank')
      const cold = trackRequests(page)
      await page.goto(`${base}/items/${ITEM}`)
      await expect(page.getByTestId('edit')).toBeVisible()
      // Cold tap: activation with no preceding hover, focus or pointerdown.
      await page.getByTestId('edit').evaluate((element: HTMLElement) => element.click())
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(cold.count(/assets\/ItemEditor-/)).toBe(1)
    })
  })
}
