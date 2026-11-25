import { defineConfig, devices } from '@playwright/test'

// Three previews of the same commit. "react-dom-b" is a second copy of the React DOM
// build: comparing it with "react-dom" gives the A/A noise floor for every metric.
export const TARGETS = {
  redact: { port: 4301, dist: 'dist-redact', renderer: 'redact' },
  'react-dom': { port: 4302, dist: 'dist-react-dom', renderer: 'react-dom' },
  'react-dom-b': { port: 4303, dist: 'dist-react-dom', renderer: 'react-dom' },
} as const
export type TargetName = keyof typeof TARGETS
export const urlOf = (target: TargetName) => `http://localhost:${TARGETS[target].port}`

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.pw\.ts$/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: [['list']],
  use: { viewport: { width: 1280, height: 800 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: Object.values(TARGETS).map((target) => ({
    command: `./node_modules/.bin/vite preview --outDir ${target.dist} --port ${target.port} --strictPort`,
    url: `http://localhost:${target.port}`,
    reuseExistingServer: true,
    env: { RENDERER: target.renderer },
  })),
})
