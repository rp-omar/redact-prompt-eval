// Byte budgets from PROMPT.md, checked against the Vite manifest of each renderer build.
// The manifest has no sizes, so every file is read and Brotli-compressed here (quality 11).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'

// VARIANT=virtual|stale0 checks a diagnostic build variant instead of the default build.
const SUFFIX = process.env.VARIANT ? `-${process.env.VARIANT}` : ''
export const BUILDS = { redact: `dist-redact${SUFFIX}`, 'react-dom': `dist-react-dom${SUFFIX}` }
// PROMPT.md says "kB"; read as 1000 bytes (the stricter reading). See FINDINGS.md.
export const LIMITS = { coldEntryJs: 150_000, routeJs: 50_000, firstViewCss: 20_000 }
// Route template -> route source files matched on entry (root layout + leaf).
export const ROUTES = {
  '/': ['src/routes/__root.tsx', 'src/routes/index.tsx'],
  '/items/$id': ['src/routes/__root.tsx', 'src/routes/items.$id.tsx'],
}

const brotli = (buffer) =>
  brotliCompressSync(buffer, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length },
  }).length

/** Static-import closure of the given manifest keys: JS files and the CSS they pull in. */
function closure(manifest, keys) {
  const js = new Set()
  const css = new Set()
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`manifest has no entry for ${key}`)
    if (chunk.file.endsWith('.js')) js.add(chunk.file)
    for (const file of chunk.css ?? []) css.add(file)
    for (const next of chunk.imports ?? []) visit(next)
  }
  keys.forEach(visit)
  return { js, css }
}

export function analyze(distDir) {
  const manifest = JSON.parse(readFileSync(join(distDir, '.vite/manifest.json'), 'utf8'))
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry)
  const shell = closure(manifest, [entryKey])
  const sizes = new Map()
  const size = (file) => {
    if (!sizes.has(file)) {
      const raw = readFileSync(join(distDir, file))
      sizes.set(file, { raw: raw.length, brotli: brotli(raw) })
    }
    return sizes.get(file)
  }
  const sum = (files) => [...files].reduce((total, file) => total + size(file).brotli, 0)

  // <link rel="modulepreload"> in the built HTML must already be inside the shell closure.
  const html = readFileSync(join(distDir, 'index.html'), 'utf8')
  const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="\/([^"]+)"/g)].map((m) => m[1])
  const strayPreloads = preloads.filter((file) => !shell.js.has(file))

  const routes = {}
  for (const [template, sources] of Object.entries(ROUTES)) {
    // Split chunks the router loads for the matched route files (autoCodeSplitting keys
    // look like "src/routes/index.tsx?tsr-split=component"). On-demand features such as
    // the lazy editor are dynamicImports of those chunks and are deliberately not followed.
    const routeKeys = Object.keys(manifest).filter((key) => sources.some((src) => key.split('?')[0] === src))
    const route = closure(manifest, routeKeys)
    const coldJs = new Set([...shell.js, ...route.js, ...strayPreloads])
    const routeJs = new Set([...route.js].filter((file) => !shell.js.has(file)))
    const css = new Set([...shell.css, ...route.css])
    routes[template] = {
      coldEntryJs: { bytes: sum(coldJs), files: [...coldJs].sort() },
      routeJs: { bytes: sum(routeJs), files: [...routeJs].sort() },
      firstViewCss: { bytes: sum(css), files: [...css].sort() },
    }
  }
  return { distDir, routes, files: Object.fromEntries(sizes) }
}

function main() {
  const report = {}
  let failed = false
  for (const [renderer, distDir] of Object.entries(BUILDS)) {
    if (!existsSync(distDir)) {
      console.error(`missing ${distDir}: run "bun run build:both" first`)
      process.exit(2)
    }
    const result = (report[renderer] = analyze(distDir))
    for (const [template, budgets] of Object.entries(result.routes)) {
      for (const [name, limit] of Object.entries(LIMITS)) {
        const { bytes, files } = budgets[name]
        const ok = bytes <= limit
        failed ||= !ok
        console.log(
          `${ok ? 'PASS' : 'FAIL'}  ${renderer.padEnd(9)} ${template.padEnd(11)} ${name.padEnd(12)} ` +
            `${String(bytes).padStart(7)} B br  / ${limit} B  (${files.length} file${files.length === 1 ? '' : 's'})`,
        )
      }
    }
  }
  mkdirSync('results', { recursive: true })
  writeFileSync(`results/budget${SUFFIX}.json`, JSON.stringify({ limits: LIMITS, builds: report }, null, 2) + '\n')
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
