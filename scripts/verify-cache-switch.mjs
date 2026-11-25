// Run-2 check (FINDINGS.md V-3): start the dev server for one renderer, stop it, start the
// other on the SAME Vite dep cache (VITE_CACHE=shared), and see whether the page still works.
// Run 1 only showed the failure with both dev servers running at once.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4390
const SEQUENCE = ['redact', 'react-dom', 'redact', 'react-dom']
rmSync('node_modules/.vite-shared', { recursive: true, force: true })
const browser = await chromium.launch()
const steps = []
for (const renderer of SEQUENCE) {
  const server = spawn('./node_modules/.bin/vite', ['--port', String(PORT), '--strictPort'], {
    env: { ...process.env, RENDERER: renderer, VITE_CACHE: 'shared' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  server.stdout.on('data', (chunk) => (log += chunk))
  server.stderr.on('data', (chunk) => (log += chunk))
  await new Promise((resolve) => {
    const timer = setInterval(() => log.includes('Local:') && (clearInterval(timer), resolve()), 50)
  })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text().slice(0, 200)))
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
  await page.goto(`http://localhost:${PORT}/`)
  const rendered = await page
    .waitForSelector('[data-testid=row]', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false)
  const state = await page.evaluate(() => ({
    marker: document.documentElement.dataset.renderer,
    rows: document.querySelectorAll('[data-testid=row]').length,
    reactDomFiber: [...document.querySelectorAll('[data-testid=row]')]
      .slice(0, 1)
      .some((row) => Object.keys(row).some((key) => key.startsWith('__reactFiber$'))),
  }))
  steps.push({ renderer, rendered, ...state, errors, reoptimized: /optimiz/i.test(log) })
  await page.close()
  server.kill('SIGTERM')
  await new Promise((resolve) => server.once('exit', resolve))
}
await browser.close()
rmSync('node_modules/.vite-shared', { recursive: true, force: true })
mkdirSync('results/raw/verify', { recursive: true })
writeFileSync('results/raw/verify/cache-switch.json', JSON.stringify(steps, null, 2) + '\n')
console.log(JSON.stringify(steps, null, 1))
