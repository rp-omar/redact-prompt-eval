import { defineConfig, devices } from '@playwright/test'

// Three previews of the same commit. "react-dom-b" is a second copy of the React DOM
// build: comparing it with "react-dom" gives the A/A noise floor for every metric.
// VARIANT=virtual|stale0 points every target at that build variant; SERVE=brotli serves the
// builds with scripts/serve.mjs (pre-compressed Brotli) instead of `vite preview`. Each
// combination gets its own ports so a reused server can never be the wrong build.
const VARIANT = process.env.VARIANT ?? ''
export const SERVE = process.env.SERVE === 'brotli' ? 'brotli' : 'preview'
const suffix = VARIANT ? `-${VARIANT}` : ''
const base = (SERVE === 'brotli' ? 4400 : 4300) + ({ '': 0, virtual: 10, stale0: 20 }[VARIANT] ?? 30)
export const CONDITION = { variant: VARIANT || 'default', serve: SERVE }

export const TARGETS = {
  redact: { port: base + 1, dist: `dist-redact${suffix}`, renderer: 'redact' },
  'react-dom': { port: base + 2, dist: `dist-react-dom${suffix}`, renderer: 'react-dom' },
  'react-dom-b': { port: base + 3, dist: `dist-react-dom${suffix}`, renderer: 'react-dom' },
} as const
export type TargetName = keyof typeof TARGETS
export const urlOf = (target: TargetName) => `http://localhost:${TARGETS[target].port}`

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.pw\.ts$/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60 * 60_000,
  reporter: [['list']],
  use: { viewport: { width: 1280, height: 800 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    // Installed Google Chrome (not Playwright's Chromium build); run with --project chrome.
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: Object.values(TARGETS).map((target) => ({
    command:
      SERVE === 'brotli'
        ? `node scripts/serve.mjs --dir ${target.dist} --port ${target.port}`
        : `./node_modules/.bin/vite preview --outDir ${target.dist} --port ${target.port} --strictPort`,
    url: `http://localhost:${target.port}`,
    reuseExistingServer: true,
    env: { RENDERER: target.renderer },
  })),
})
