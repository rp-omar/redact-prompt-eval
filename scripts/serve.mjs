// Production-like static server for the built app: every file is pre-compressed with Brotli
// (quality 11, the same setting the budget script uses) and served with content-encoding: br.
// The mock API is mounted too, and its JSON is Brotli-compressed as well (quality 5, cached).
// `vite preview` serves uncompressed files, which overstates the byte gap between renderers
// on a throttled network (FINDINGS.md F-28).
//   node scripts/serve.mjs --dir dist-redact --port 4401 [--inject-marks]
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import { brotliCompressSync, constants } from 'node:zlib'
import { middleware as api } from '../mock/api-plugin.ts'
import { installMarks } from './marks.mjs'

const { values } = parseArgs({
  options: { dir: { type: 'string' }, port: { type: 'string' }, 'inject-marks': { type: 'boolean' } },
})
const dir = values.dir ?? 'dist-redact'
const port = Number(values.port ?? 4401)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}
const brotli = (buffer, quality) =>
  brotliCompressSync(buffer, {
    params: { [constants.BROTLI_PARAM_QUALITY]: quality, [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length },
  })

const files = new Map()
const walk = (current) => {
  for (const name of readdirSync(current)) {
    const path = join(current, name)
    if (statSync(path).isDirectory()) walk(path)
    else {
      let raw = readFileSync(path)
      // WebDriver has no init-script hook, so real-browser runs get the marks from the server.
      if (values['inject-marks'] && name === 'index.html')
        raw = Buffer.from(raw.toString().replace('<head>', `<head><script>(${installMarks})()</script>`))
      files.set('/' + relative(dir, path), { raw, br: brotli(raw, 11), type: TYPES[extname(name)] })
    }
  }
}
walk(dir)

const apiCache = new Map()
const acceptsBr = (req) => /\bbr\b/.test(String(req.headers['accept-encoding'] ?? ''))

createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path.startsWith('/api/')) {
    if (acceptsBr(req)) {
      const end = res.end.bind(res)
      res.end = (body) => {
        const key = `${req.method} ${path} ${body.length}`
        let compressed = req.method === 'GET' ? apiCache.get(key) : undefined
        if (!compressed) {
          compressed = brotli(Buffer.from(body), 5)
          if (req.method === 'GET') apiCache.set(key, compressed)
        }
        res.setHeader('content-encoding', 'br')
        res.setHeader('content-length', compressed.length)
        return end(compressed)
      }
    }
    return api(req, res, () => res.writeHead(404).end())
  }
  // SPA fallback: unknown paths get index.html.
  const file = files.get(path) ?? files.get('/index.html')
  const immutable = path.startsWith('/assets/')
  res.setHeader('content-type', file.type ?? 'application/octet-stream')
  res.setHeader('cache-control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
  res.setHeader('vary', 'accept-encoding')
  const body = acceptsBr(req) ? file.br : file.raw
  if (body === file.br) res.setHeader('content-encoding', 'br')
  res.setHeader('content-length', body.length)
  res.end(body)
}).listen(port, () => console.log(`serving ${dir} with Brotli on http://localhost:${port}`))
