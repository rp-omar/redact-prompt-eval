// Run-2 check (FINDINGS.md V-6): `react-doctor scan` without a person at the keyboard.
// The scan attaches to a Chrome we start (--cdp); Playwright drives one interaction in the
// tab the scan opens; then Enter is written to the scan's stdin (it also ends by itself
// after five minutes). The trace goes to .doctor/, which is git-ignored.
//   node scripts/doctor-scan.mjs redact|react-dom
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const renderer = process.argv[2] === 'react-dom' ? 'react-dom' : 'redact'
const PORT = renderer === 'redact' ? 4471 : 4472
const CDP = 9333
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
mkdirSync('.doctor', { recursive: true })

const server = spawn('node', ['scripts/serve.mjs', '--dir', `dist-${renderer}`, '--port', String(PORT)], {
  stdio: 'ignore',
})
const browser = await chromium.launch({ args: [`--remote-debugging-port=${CDP}`] })
await sleep(1500)
// The scan refuses to start without a terminal ("requires an interactive terminal"), so it
// runs on a pseudo-terminal from Python's pty module, which forwards our piped stdin to it.
// (script(1) does not work here: it needs a terminal on its own stdin.)
const scan = spawn(
  'python3',
  ['-c', 'import pty,sys; pty.spawn(sys.argv[1:])', './node_modules/.bin/react-doctor', 'scan', `http://localhost:${PORT}/`, '--cdp', `http://127.0.0.1:${CDP}`, '--format', 'json', '--trace-out', `.doctor/${renderer}.trace.json.gz`],
  { stdio: ['pipe', 'pipe', 'pipe'] },
)
let stdout = ''
let stderr = ''
scan.stdout.on('data', (chunk) => (stdout += chunk))
scan.stderr.on('data', (chunk) => (stderr += chunk))
const exited = new Promise((resolve) => scan.once('exit', resolve))

let drove = 'no scan tab found'
try {
  const attached = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  let page
  for (let attempt = 0; attempt < 60 && !page; attempt++) {
    page = attached.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes(`:${PORT}`))
    if (!page) await sleep(500)
  }
  if (page) {
    await page.waitForSelector('[data-testid=row]', { timeout: 30_000 })
    await page.locator('[data-testid=filter]').click()
    for (const key of ['a', 'n', 'd', 'r', 'e']) {
      await page.keyboard.press(key)
      await sleep(400)
    }
    await page.locator('[data-testid=row] a').first().click()
    await page.waitForSelector('[data-testid=activity]', { timeout: 30_000 })
    await sleep(1000)
    drove = 'typed 5 keys in the filter, clicked the first row, waited for the activity panel'
  }
} catch (error) {
  drove = `driving failed: ${error}`
}
scan.stdin.write('\n')
const code = await Promise.race([exited, sleep(330_000).then(() => 'still running after 5.5 min')])
if (code === 'still running after 5.5 min') scan.kill()
writeFileSync(`.doctor/${renderer}.report.json`, stdout)
console.log(JSON.stringify({ renderer, drove, exit: code, stderr: stderr.slice(0, 1500), stdoutBytes: stdout.length }, null, 1))
console.log(stdout.slice(0, 2500))
await browser.close()
server.kill()
